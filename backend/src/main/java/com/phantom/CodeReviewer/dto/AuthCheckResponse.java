package com.phantom.CodeReviewer.dto;

public record AuthCheckResponse(
        boolean authenticated,
        String email,
        String role,
        String message,
        String name,
        String username,
        boolean githubConnected
) {
    public AuthCheckResponse(boolean authenticated, String email, String role, String message) {
        this(authenticated, email, role, message, null, null, false);
    }
}
