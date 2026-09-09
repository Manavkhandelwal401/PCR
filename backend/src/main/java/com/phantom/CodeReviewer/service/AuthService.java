package com.phantom.CodeReviewer.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    // In-memory thread-safe storage for OTPs: email -> OtpRecord
    private final Map<String, OtpRecord> otpStore = new ConcurrentHashMap<>();

    private final SecretKey secretKey;
    private final long tokenValidityMs = 1000L * 60 * 60 * 24; // 24 hours

    public AuthService(@Value("${app.jwt.secret:${APP_JWT_SECRET:}}") String jwtSecret) {
        if (jwtSecret == null || jwtSecret.trim().length() < 32) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: 'app.jwt.secret' (or environment variable 'APP_JWT_SECRET') " +
                    "is required and must be at least 32 characters (256 bits). Application startup aborted."
            );
        }
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Helper to extract and validate user email (subject) from Authorization: Bearer token header.
     * Returns null if missing or invalid.
     */
    public String extractEmailFromAuthHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            String token = authHeader.substring(7).trim();
            Claims claims = validateToken(token);
            return claims.getSubject() != null ? claims.getSubject().toLowerCase().trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public record OtpRecord(String otp, long expiryTimeMillis) {}

    /**
     * Generates a 6-digit OTP, stores it in memory (5 mins expiry), and prints to console.
     */
    public String generateAndSendOtp(String email) {
        // Generate 6-digit OTP (e.g. 100000 - 999999)
        int randomPin = (int) (Math.random() * 900000) + 100000;
        String otp = String.valueOf(randomPin);
        long expiry = System.currentTimeMillis() + (5 * 60 * 1000L); // 5 minutes

        otpStore.put(email.toLowerCase().trim(), new OtpRecord(otp, expiry));

        System.out.println("=================================================");
        System.out.println(" [PCR AUTH SIMULATOR] Generated OTP for: " + email);
        System.out.println(" --> CODE: " + otp + " (Expires in 5 minutes)");
        System.out.println("=================================================");

        return otp;
    }

    /**
     * Verifies provided OTP against stored record.
     */
    public boolean verifyOtp(String email, String inputOtp) {
        String key = email.toLowerCase().trim();
        OtpRecord record = otpStore.get(key);
        if (record == null) {
            return false;
        }
        if (System.currentTimeMillis() > record.expiryTimeMillis()) {
            otpStore.remove(key);
            return false;
        }
        boolean matches = record.otp().equals(inputOtp.trim());
        if (matches) {
            otpStore.remove(key); // invalidate once used
        }
        return matches;
    }

    /**
     * Issues a standard signed HMAC SHA-256 JWT for authenticated users.
     */
    public String generateUserToken(String email, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + tokenValidityMs))
                .signWith(secretKey)
                .compact();
    }

    /**
     * Issues a short-lived (10 mins) signed HMAC SHA-256 state token for OAuth CSRF protection.
     */
    public String generateOAuthState(String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(email.toLowerCase().trim())
                .claim("type", "oauth_state")
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + 10 * 60 * 1000L)) // 10 minutes validity
                .signWith(secretKey)
                .compact();
    }

    /**
     * Validates OAuth state token against expected user email.
     */
    public boolean validateOAuthState(String stateToken, String expectedEmail) {
        if (stateToken == null || stateToken.isBlank()) {
            return false;
        }
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(stateToken.trim())
                    .getBody();
            return "oauth_state".equals(claims.get("type")) &&
                    expectedEmail != null &&
                    expectedEmail.equalsIgnoreCase(claims.getSubject());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Validates that an OAuth state token was signed by PCR and has not expired,
     * returning the subject (e.g. email or "anonymous_login") if valid, or null if invalid.
     */
    public String validateAnyOAuthState(String stateToken) {
        if (stateToken == null || stateToken.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(stateToken.trim())
                    .getBody();
            if ("oauth_state".equals(claims.get("type"))) {
                return claims.getSubject();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Validates JWT token and extracts claims.
     */
    public Claims validateToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
