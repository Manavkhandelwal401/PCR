package com.phantom.CodeReviewer.controller;

import com.phantom.CodeReviewer.dto.*;
import com.phantom.CodeReviewer.entity.User;
import com.phantom.CodeReviewer.repository.UserRepository;
import com.phantom.CodeReviewer.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    private final RestTemplate restTemplate;

    @Value("${github.oauth.client-id}")
    private String githubClientId;

    @Value("${github.oauth.client-secret}")
    private String githubClientSecret;

    @Value("${github.oauth.redirect-uri}")
    private String githubRedirectUri;

    /**
     * Generate secure signed OAuth state token for GitHub OAuth flow
     * GET /api/v1/auth/github/state
     */
    @GetMapping("/github/state")
    public ResponseEntity<?> getGithubOAuthState(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        String email = authService.extractEmailFromAuthHeader(authHeader);
        String subject = (email != null && !email.isBlank()) ? email : "anonymous_login";
        String state = authService.generateOAuthState(subject);
        return ResponseEntity.ok(java.util.Map.of("state", state));
    }

    /**
     * 1. Send OTP for Sign Up
     * POST /api/v1/auth/signup/send-otp
     */
    @PostMapping("/signup/send-otp")
    public ResponseEntity<AuthResponse> sendSignUpOtp(@Valid @RequestBody SignUpInitRequest request) {
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(AuthResponse.ofError("An account with this email already exists. Please sign in instead."));
        }

        String otp = authService.generateAndSendOtp(email);
        return ResponseEntity.ok(AuthResponse.ofSuccess(
                "OTP sent successfully. Please check your inbox (or backend logs: " + otp + ").",
                null,
                email,
                null
        ));
    }

    /**
     * 2. Verify OTP & Register User
     * POST /api/v1/auth/signup/verify
     */
    @PostMapping("/signup/verify")
    public ResponseEntity<AuthResponse> verifySignUpOtp(@Valid @RequestBody OtpVerifyRequest request) {
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(AuthResponse.ofError("Account already registered."));
        }

        boolean isValidOtp = authService.verifyOtp(email, request.otp());
        if (!isValidOtp) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthResponse.ofError("Invalid or expired OTP code. Please request a new one."));
        }

        // Hash password and persist user
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role("ROLE_USER")
                .enabled(true)
                .build();

        userRepository.save(user);

        // Generate JWT token
        String jwtToken = authService.generateUserToken(user.getEmail(), user.getRole());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(AuthResponse.ofSuccess(
                        "Registration successful! Welcome to PCR.",
                        jwtToken,
                        user.getEmail(),
                        user.getRole()
                ));
    }

    /**
     * 3. Sign In (Validate credentials + simulated Captcha)
     * POST /api/v1/auth/signin
     */
    @PostMapping("/signin")
    public ResponseEntity<AuthResponse> signIn(@Valid @RequestBody SignInRequest request) {
        String email = request.email().toLowerCase().trim();

        // Check user existence
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.ofError("Invalid email or password."));
        }

        User user = userOpt.get();

        // Verify password
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.ofError("Invalid email or password."));
        }

        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AuthResponse.ofError("Your account has been disabled."));
        }

        // Issue JWT token
        String jwtToken = authService.generateUserToken(user.getEmail(), user.getRole());

        return ResponseEntity.ok(AuthResponse.ofSuccess(
                "Signed in successfully.",
                jwtToken,
                user.getEmail(),
                user.getRole(),
                user.getName(),
                user.getUsername()
        ));
    }

    /**
     * 4. Check Authentication / Validate Token
     * GET /api/v1/auth/auth-check
     */
    @GetMapping("/auth-check")
    public ResponseEntity<AuthCheckResponse> checkAuth(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthCheckResponse(false, null, null, "No Authorization header provided"));
        }

        String token = authHeader.substring(7).trim();
        try {
            Claims claims = authService.validateToken(token);
            String email = claims.getSubject();
            String role = (String) claims.get("role");

            Optional<User> userOpt = (email != null) ? userRepository.findByEmail(email.toLowerCase().trim()) : Optional.empty();
            String name = userOpt.map(User::getName).orElse(null);
            String username = userOpt.map(User::getUsername).orElse(null);
            boolean githubConnected = userOpt.map(u -> u.getGithubAccessToken() != null && !u.getGithubAccessToken().isBlank()).orElse(false);

            return ResponseEntity.ok(new AuthCheckResponse(true, email, role, "Token is active", name, username, githubConnected));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthCheckResponse(false, null, null, "Token expired or invalid: " + e.getMessage()));
        }
    }

    /**
     * 4a. Check Username Availability
     * GET /api/v1/auth/username-check?username={username}&email={email}
     */
    @GetMapping("/username-check")
    public ResponseEntity<UsernameCheckResponse> checkUsernameAvailability(
            @RequestParam("username") String rawUsername,
            @RequestParam(value = "email", required = false) String email
    ) {
        String username = rawUsername != null ? rawUsername.trim().toLowerCase() : "";

        if (username.length() < 3 || username.length() > 30) {
            return ResponseEntity.ok(new UsernameCheckResponse(
                    false,
                    username,
                    "Username must be between 3 and 30 characters."
            ));
        }

        if (!username.matches("^[a-z0-9_]+$")) {
            return ResponseEntity.ok(new UsernameCheckResponse(
                    false,
                    username,
                    "Only lowercase letters, numbers, and underscores are allowed."
            ));
        }

        boolean taken;
        if (email != null && !email.isBlank()) {
            taken = userRepository.existsByUsernameIgnoreCaseAndEmailNot(username, email.trim().toLowerCase());
        } else {
            taken = userRepository.existsByUsernameIgnoreCase(username);
        }

        if (taken) {
            return ResponseEntity.ok(new UsernameCheckResponse(
                    false,
                    username,
                    "Username @" + username + " is already taken."
            ));
        }

        return ResponseEntity.ok(new UsernameCheckResponse(
                true,
                username,
                "Username @" + username + " is available!"
        ));
    }

    /**
     * 4b. Update Candidate Profile (Name & Username)
     * PUT /api/v1/auth/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.ofError("Authorization token required."));
        }

        String token = authHeader.substring(7).trim();
        String email;
        try {
            Claims claims = authService.validateToken(token);
            email = claims.getSubject();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.ofError("Session expired or invalid token."));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(AuthResponse.ofError("User not found."));
        }

        User user = userOpt.get();
        String sanitizedUsername = request.username().trim().toLowerCase();
        String sanitizedName = request.name().trim();

        // Check if username is already taken by another user
        if (userRepository.existsByUsernameIgnoreCaseAndEmailNot(sanitizedUsername, email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(AuthResponse.ofError("Username @" + sanitizedUsername + " is already taken by another account."));
        }

        user.setName(sanitizedName);
        user.setUsername(sanitizedUsername);
        userRepository.save(user);

        return ResponseEntity.ok(AuthResponse.ofSuccess(
                "Profile updated successfully.",
                null,
                user.getEmail(),
                user.getRole(),
                user.getName(),
                user.getUsername()
        ));
    }

    /**
     * 5. GitHub Direct OAuth Callback & Token Exchange
     * Supports both:
     * - Unauthenticated users (1-click GitHub Login / Sign-up)
     * - Authenticated users (linking GitHub account from Repositories page)
     * POST /api/v1/auth/github/callback
     */
    @PostMapping("/github/callback")
    public ResponseEntity<?> handleGithubOAuthCallback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody java.util.Map<String, String> request
    ) {
        String code = request.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "OAuth authorization code is required"));
        }

        String clientState = request.get("state");
        if (clientState == null || clientState.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Missing OAuth state parameter."));
        }

        // Validate state token to protect against OAuth CSRF forgery
        String stateSubject = authService.validateAnyOAuthState(clientState);
        if (stateSubject == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", "Invalid or expired OAuth state parameter. Please reconnect."));
        }

        // Determine if this request is from an authenticated user
        String authenticatedEmail = authService.extractEmailFromAuthHeader(authHeader);

        try {
            // 1. Exchange temporary authorization code for user access token
            String tokenUrl = "https://github.com/login/oauth/access_token";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Accept", "application/json");

            java.util.Map<String, String> body = new java.util.HashMap<>();
            body.put("client_id", githubClientId);
            body.put("client_secret", githubClientSecret);
            body.put("code", code);
            body.put("redirect_uri", githubRedirectUri);
            body.put("state", clientState);

            org.springframework.http.HttpEntity<java.util.Map<String, String>> tokenEntity = new org.springframework.http.HttpEntity<>(body, headers);
            ResponseEntity<java.util.Map> tokenResponse = restTemplate.postForEntity(tokenUrl, tokenEntity, java.util.Map.class);

            java.util.Map tokenMap = tokenResponse.getBody();
            if (tokenMap == null || !tokenMap.containsKey("access_token")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of(
                        "error", tokenMap != null && tokenMap.containsKey("error_description")
                                ? tokenMap.get("error_description")
                                : "Failed to obtain GitHub access token"
                ));
            }

            String accessToken = (String) tokenMap.get("access_token");

            // 2. Fetch authenticated GitHub user profile
            org.springframework.http.HttpHeaders userHeaders = new org.springframework.http.HttpHeaders();
            userHeaders.set("Authorization", "Bearer " + accessToken);
            userHeaders.set("Accept", "application/vnd.github.v3+json");
            org.springframework.http.HttpEntity<Void> userEntity = new org.springframework.http.HttpEntity<>(userHeaders);

            ResponseEntity<java.util.Map> userResponse = restTemplate.exchange(
                    "https://api.github.com/user",
                    org.springframework.http.HttpMethod.GET,
                    userEntity,
                    java.util.Map.class
            );

            java.util.Map userData = userResponse.getBody();
            if (userData == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(java.util.Map.of("error", "Failed to retrieve GitHub profile."));
            }

            String ghLogin = (String) userData.get("login");
            String ghName = (String) userData.get("name");
            String ghEmail = (String) userData.get("email");

            // If public email is empty, query GitHub's user emails endpoint to get the primary verified email
            if (ghEmail == null || ghEmail.isBlank()) {
                try {
                    ResponseEntity<java.util.List> emailsResponse = restTemplate.exchange(
                            "https://api.github.com/user/emails",
                            org.springframework.http.HttpMethod.GET,
                            userEntity,
                            java.util.List.class
                    );
                    if (emailsResponse.getBody() != null) {
                        for (Object obj : emailsResponse.getBody()) {
                            if (obj instanceof java.util.Map<?, ?> emMap) {
                                Boolean primary = (Boolean) emMap.get("primary");
                                Boolean verified = (Boolean) emMap.get("verified");
                                String em = (String) emMap.get("email");
                                if (Boolean.TRUE.equals(primary) && em != null) {
                                    ghEmail = em;
                                    break;
                                } else if (ghEmail == null && Boolean.TRUE.equals(verified) && em != null) {
                                    ghEmail = em;
                                }
                            }
                        }
                    }
                } catch (Exception ex) {
                    // Fallback email if private/unfetchable
                }
            }

            if (ghEmail == null || ghEmail.isBlank()) {
                ghEmail = (ghLogin != null ? ghLogin.toLowerCase() : "user") + "@users.noreply.github.com";
            }
            ghEmail = ghEmail.toLowerCase().trim();

            // 3. User account resolution / provisioning
            User user;
            String jwtToken;

            if (authenticatedEmail != null) {
                // Scenario A: Already signed in, linking GitHub account
                Optional<User> userOpt = userRepository.findByEmail(authenticatedEmail.toLowerCase());
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                    user.setGithubAccessToken(accessToken);
                    if (user.getName() == null && ghName != null) {
                        user.setName(ghName);
                    }
                    userRepository.save(user);
                } else {
                    user = null;
                }
                jwtToken = authHeader.substring(7).trim();
            } else {
                // Scenario B: 1-Click GitHub Sign In / Sign Up
                Optional<User> userOpt = userRepository.findByEmail(ghEmail);
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                    user.setGithubAccessToken(accessToken);
                    if (user.getName() == null && ghName != null) {
                        user.setName(ghName);
                    }
                    userRepository.save(user);
                } else {
                    // Generate unique username
                    String candidateUsername = (ghLogin != null ? ghLogin.toLowerCase().replaceAll("[^a-z0-9_]", "") : "user");
                    if (candidateUsername.length() < 3) candidateUsername = candidateUsername + "_dev";
                    if (userRepository.existsByUsernameIgnoreCase(candidateUsername)) {
                        candidateUsername = candidateUsername + "_" + (System.currentTimeMillis() % 10000);
                    }

                    user = User.builder()
                            .email(ghEmail)
                            .name(ghName != null ? ghName : ghLogin)
                            .username(candidateUsername)
                            .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                            .role("ROLE_USER")
                            .githubAccessToken(accessToken)
                            .enabled(true)
                            .build();
                    userRepository.save(user);
                }
                jwtToken = authService.generateUserToken(user.getEmail(), user.getRole());
            }

            // 4. Fetch user repositories
            ResponseEntity<java.util.List> reposResponse = restTemplate.exchange(
                    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
                    org.springframework.http.HttpMethod.GET,
                    userEntity,
                    java.util.List.class
            );
            java.util.List reposData = reposResponse.getBody();

            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("success", true);
            result.put("hasPrivateAccess", true);
            result.put("token", jwtToken);
            if (user != null) {
                result.put("email", user.getEmail());
                result.put("name", user.getName());
                result.put("username", user.getUsername());
                result.put("role", user.getRole());
            }
            result.put("user", userData);
            result.put("repositories", reposData != null ? reposData : java.util.Collections.emptyList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("GitHub OAuth authorization error during token exchange or profile resolution:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(java.util.Map.of(
                    "error", "GitHub OAuth authorization failed: " + e.getMessage()
            ));
        }
    }

    /**
     * 6. Google Sign In / Sign Up Endpoint
     * Verifies Google ID token via Google tokeninfo API,
     * provisions or authenticates the user, and issues a PCR JWT token.
     * POST /api/v1/auth/google/signin
     */
    @PostMapping("/google/signin")
    public ResponseEntity<?> handleGoogleSignIn(@RequestBody java.util.Map<String, String> request) {
        String credential = request.get("credential");
        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest().body(AuthResponse.ofError("Google ID credential is required."));
        }

        try {
            // Verify Google ID token using Google's tokeninfo API
            String verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
            ResponseEntity<java.util.Map> response = restTemplate.getForEntity(verifyUrl, java.util.Map.class);
            java.util.Map payload = response.getBody();

            if (payload == null || !payload.containsKey("email")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.ofError("Invalid or expired Google authentication token."));
            }

            String email = ((String) payload.get("email")).toLowerCase().trim();
            String name = (String) payload.get("name");
            Boolean emailVerified = Boolean.parseBoolean(String.valueOf(payload.get("email_verified")));

            if (!Boolean.TRUE.equals(emailVerified)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(AuthResponse.ofError("Google account email is not verified."));
            }

            // Find or create User in PostgreSQL
            User user;
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                user = userOpt.get();
                if (!user.isEnabled()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(AuthResponse.ofError("Your account has been disabled."));
                }
                if (user.getName() == null && name != null) {
                    user.setName(name);
                    userRepository.save(user);
                }
            } else {
                // Extract clean initial username
                String baseUsername = email.contains("@") ? email.substring(0, email.indexOf("@")).replaceAll("[^a-z0-9_]", "") : "user";
                if (baseUsername.length() < 3) baseUsername = baseUsername + "_dev";
                String candidateUsername = baseUsername;
                if (userRepository.existsByUsernameIgnoreCase(candidateUsername)) {
                    candidateUsername = candidateUsername + "_" + (System.currentTimeMillis() % 10000);
                }

                user = User.builder()
                        .email(email)
                        .name(name != null ? name : baseUsername)
                        .username(candidateUsername)
                        .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                        .role("ROLE_USER")
                        .enabled(true)
                        .build();
                userRepository.save(user);
            }

            // Mint PCR JWT token
            String jwtToken = authService.generateUserToken(user.getEmail(), user.getRole());

            return ResponseEntity.ok(AuthResponse.ofSuccess(
                    "Signed in with Google successfully.",
                    jwtToken,
                    user.getEmail(),
                    user.getRole(),
                    user.getName(),
                    user.getUsername()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    AuthResponse.ofError("Google authentication failed: " + e.getMessage())
            );
        }
    }

    /**
     * 7. Disconnect GitHub Account
     * POST /api/v1/auth/github/disconnect
     */
    @PostMapping("/github/disconnect")
    public ResponseEntity<?> disconnectGithub(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Unauthorized"));
        }

        try {
            String token = authHeader.substring(7).trim();
            Claims claims = authService.validateToken(token);
            String email = claims.getSubject().toLowerCase().trim();

            userRepository.findByEmail(email).ifPresent(user -> {
                user.setGithubAccessToken(null);
                userRepository.save(user);
            });

            return ResponseEntity.ok(java.util.Map.of("success", true, "message", "GitHub account disconnected and credentials purged."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("error", "Invalid or expired session."));
        }
    }
}

