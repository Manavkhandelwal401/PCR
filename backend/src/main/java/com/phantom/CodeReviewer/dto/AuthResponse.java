package com.phantom.CodeReviewer.dto;

public record AuthResponse(
        boolean success,
        String message,
        String token,
        String email,
        String role,
        String name,
        String username
) {
    public static AuthResponse ofSuccess(String message, String token, String email, String role, String name, String username) {
        return new AuthResponse(true, message, token, email, role, name, username);
    }

    public static AuthResponse ofSuccess(String message, String token, String email, String role) {
        return new AuthResponse(true, message, token, email, role, null, null);
    }

    public static AuthResponse ofError(String message) {
        return new AuthResponse(false, message, null, null, null, null, null);
    }
}
