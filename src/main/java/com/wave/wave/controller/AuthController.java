package com.wave.wave.controller;

import com.wave.wave.dto.*;
import com.wave.wave.model.User;
import com.wave.wave.service.FriendshipService;
import com.wave.wave.service.OtpService;
import com.wave.wave.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private FriendshipService friendshipService;

    @Autowired
    private OtpService otpService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? null : auth.getPrincipal().toString();
    }

    @PostMapping("/request-otp")
    public ResponseEntity<ApiResponse<Void>> requestOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        otpService.generateAndSend(email);
        return ResponseEntity.ok(ApiResponse.ok("Verification code sent"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        if (email == null || code == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("email and code are required"));
        }
        OtpService.VerifyResult r = otpService.verify(email, code);
        switch (r) {
            case OK:
                return ResponseEntity.ok(ApiResponse.ok("Email verified", Map.of("verified", true)));
            case INVALID:
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Invalid verification code"));
            case NO_PENDING:
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("No pending code — request a new one"));
            case TOO_MANY_ATTEMPTS:
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(ApiResponse.error("Too many attempts — request a new code"));
            default:
                return ResponseEntity.internalServerError().body(ApiResponse.error("Unexpected error"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(@Valid @RequestBody RegisterRequest request) {
        if (!otpService.isEmailVerifiedRecently(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Email not verified — request a code first"));
        }
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
        String myId = me();
        List<Map<String, Object>> users = userService.searchUsers(q).stream()
                .filter(u -> myId == null || !u.getUserId().toString().equals(myId))
                .map(u -> {
                    String otherId = u.getUserId().toString();
                    String relationship = "NONE";
                    if (myId != null) {
                        Map<String, Object> status = friendshipService.getStatus(myId, otherId);
                        String s = (String) status.get("status");
                        boolean isSender = Boolean.TRUE.equals(status.get("isSender"));
                        if ("ACCEPTED".equals(s)) relationship = "FRIEND";
                        else if ("PENDING".equals(s)) relationship = isSender ? "PENDING_OUT" : "PENDING_IN";
                    }
                    Map<String, Object> m = new HashMap<>();
                    m.put("userId", otherId);
                    m.put("displayName", u.getDisplayName());
                    m.put("username", u.getUsername() != null ? u.getUsername() : "");
                    m.put("publicKey", u.getPublicKey() != null ? u.getPublicKey() : "");
                    m.put("relationship", relationship);
                    return m;
                })
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
