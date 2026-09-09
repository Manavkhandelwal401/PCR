package com.phantom.CodeReviewer.dto;

public record UsernameCheckResponse(
        boolean available,
        String username,
        String message
) {}
