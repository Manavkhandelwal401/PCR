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
    private final org.springframework.mail.javamail.JavaMailSender mailSender;

    @Value("${spring.mail.username:manavkhandelwal06@gmail.com}")
    private String mailFrom;

    public AuthService(
            @Value("${app.jwt.secret:${APP_JWT_SECRET:}}") String jwtSecret,
            @org.springframework.beans.factory.annotation.Autowired(required = false) org.springframework.mail.javamail.JavaMailSender mailSender
    ) {
        if (jwtSecret == null || jwtSecret.trim().length() < 32) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: 'app.jwt.secret' (or environment variable 'APP_JWT_SECRET') " +
                    "is required and must be at least 32 characters (256 bits). Application startup aborted."
            );
        }
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8));
        this.mailSender = mailSender;
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
     * Generates a 6-digit OTP, sends real email via Gmail SMTP, and stores in memory (5 mins expiry).
     */
    public String generateAndSendOtp(String email) {
        // Generate 6-digit OTP (e.g. 100000 - 999999)
        int randomPin = (int) (Math.random() * 900000) + 100000;
        String otp = String.valueOf(randomPin);
        long expiry = System.currentTimeMillis() + (5 * 60 * 1000L); // 5 minutes

        otpStore.put(email.toLowerCase().trim(), new OtpRecord(otp, expiry));

        System.out.println("=================================================");
        System.out.println(" [PCR AUTH SERVICE] Generated OTP for: " + email);
        System.out.println(" --> CODE: " + otp + " (Expires in 5 minutes)");
        System.out.println("=================================================");

        // Send real email via JavaMailSender
        sendOtpEmail(email, otp);

        return otp;
    }

    private void sendOtpEmail(String recipientEmail, String otp) {
        if (mailSender == null) {
            System.err.println("Notice: JavaMailSender not configured, OTP printed to console.");
            return;
        }

        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper =
                    new org.springframework.mail.javamail.MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "Phantom Code Reviewer (PCR)");
            helper.setTo(recipientEmail);
            helper.setSubject("Your PCR Verification Code: " + otp);

            String htmlBody = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050d08; color: #EEF4EF; margin: 0; padding: 24px; }
                    .card { max-width: 480px; margin: 0 auto; background: #0c1811; border: 1px solid #1b4d2e; border-radius: 12px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
                    .header { text-align: center; margin-bottom: 24px; }
                    .logo { font-size: 24px; font-weight: bold; color: #22c55e; letter-spacing: 2px; }
                    .title { font-size: 18px; color: #ffffff; margin-top: 12px; }
                    .text { font-size: 14px; color: #9cb5a2; line-height: 1.6; margin-bottom: 24px; }
                    .otp-box { background: #122519; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }
                    .otp { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4ade80; }
                    .footer { font-size: 11px; color: #52705a; text-align: center; border-top: 1px solid #1b3324; padding-top: 16px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="header">
                      <div class="logo">⚡ PHANTOM CODE REVIEWER</div>
                      <div class="title">Verify Your Email Address</div>
                    </div>
                    <p class="text">Hello,</p>
                    <p class="text">Welcome to PCR! Please use the 6-digit verification code below to complete your registration. This code will expire in <strong>5 minutes</strong>.</p>
                    <div class="otp-box">
                      <span class="otp">%s</span>
                    </div>
                    <p class="text">If you did not request this verification code, please ignore this message.</p>
                    <div class="footer">
                      &copy; 2026 Phantom Code Reviewer (PCR). Automated Invariant & Security Auditing.
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(otp);

            helper.setText(htmlBody, true);

            mailSender.send(message);
            System.out.println("--> [PCR-MAIL] Successfully dispatched OTP email to: " + recipientEmail);
        } catch (Exception e) {
            System.err.println("--> [PCR-MAIL-ERROR] Failed to send email to " + recipientEmail + ": " + e.getMessage());
        }
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
