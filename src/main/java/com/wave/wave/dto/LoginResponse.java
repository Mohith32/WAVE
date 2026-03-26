package com.wave.wave.dto;

public class LoginResponse {
    private String token;
    private String userId;
    private String email;
    private String displayName;
    private String publicKey;

    public LoginResponse(String token, String userId, String email, String displayName, String publicKey) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.displayName = displayName;
        this.publicKey = publicKey;
    }

    public String getToken() { return token; }
    public String getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPublicKey() { return publicKey; }
}
