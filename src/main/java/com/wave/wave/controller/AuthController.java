package com.wave.wave.controller;

import com.wave.wave.dto.*;
import com.wave.wave.model.User;
import com.wave.wave.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.registerUser(request);
        return ResponseEntity.ok(ApiResponse.ok("Registration successful", Map.of(
                "userId", user.getUserId().toString(),
                "email", user.getEmail(),
                "displayName", user.getDisplayName()
        )));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = userService.loginUser(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllUsers() {
        List<Map<String, Object>> users = userService.getAllUsers().stream()
                .map(u -> Map.<String, Object>of(
                        "userId", u.getUserId().toString(),
                        "email", u.getEmail(),
                        "displayName", u.getDisplayName(),
                        "username", u.getUsername() != null ? u.getUsername() : "",
                        "online", u.isOnline(),
                        "publicKey", u.getPublicKey() != null ? u.getPublicKey() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Users fetched", users));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> searchUsers(@RequestParam String q) {
        List<Map<String, Object>> users = userService.searchUsers(q).stream()
                .map(u -> Map.<String, Object>of(
                        "userId", u.getUserId().toString(),
                        "displayName", u.getDisplayName(),
                        "username", u.getUsername() != null ? u.getUsername() : "",
                        "publicKey", u.getPublicKey() != null ? u.getPublicKey() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Search results", users));
    }

    @PutMapping("/public-key")
    public ResponseEntity<ApiResponse<Void>> updatePublicKey(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {
        String userId = extractUserIdFromAuth(authHeader);
        userService.updatePublicKey(UUID.fromString(userId), body.get("publicKey"));
        return ResponseEntity.ok(ApiResponse.ok("Public key updated"));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUser(@PathVariable String userId) {
        return userService.findById(UUID.fromString(userId))
                .map(u -> ResponseEntity.ok(ApiResponse.ok("User found", Map.<String, Object>of(
                        "userId", u.getUserId().toString(),
                        "email", u.getEmail(),
                        "displayName", u.getDisplayName(),
                        "online", u.isOnline(),
                        "publicKey", u.getPublicKey() != null ? u.getPublicKey() : ""
                ))))
                .orElse(ResponseEntity.notFound().build());
    }

    private String extractUserIdFromAuth(String authHeader) {
        return authHeader.substring(7);
    }
}
