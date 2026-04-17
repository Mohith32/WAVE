package com.wave.wave.service;

import com.wave.wave.dto.LoginRequest;
import com.wave.wave.dto.LoginResponse;
import com.wave.wave.dto.RegisterRequest;
import com.wave.wave.exception.UserAlreadyExistsException;
import com.wave.wave.model.User;
import com.wave.wave.repository.UserRepository;
import com.wave.wave.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public User registerUser(RegisterRequest request) {
        if (userRepo.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("An account with this email already exists");
        }
        String username = generateUsername(request.getDisplayName());
        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String clean = request.getUsername().toLowerCase().replaceAll("[^a-z0-9_.]", "");
            if (!userRepo.existsByUsername(clean)) username = clean;
        }
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setPublicKey(request.getPublicKey());
        user.setUsername(username);
        return userRepo.save(user);
    }

    public LoginResponse loginUser(LoginRequest request) {
        User user = userRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        String token = jwtUtil.generateToken(user.getUserId().toString(), user.getEmail());
        return new LoginResponse(token, user.getUserId().toString(), user.getEmail(), user.getDisplayName(), user.getPublicKey());
    }

    @Cacheable(value = "users", key = "#userId")
    public Optional<User> findById(UUID userId) {
        return userRepo.findById(userId);
    }

    @Cacheable(value = "users", key = "#email")
    public Optional<User> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public List<User> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) return List.of();
        return userRepo.searchUsers(query.trim());
    }

    @Caching(evict = {
            @CacheEvict(value = "users", key = "#userId"),
            @CacheEvict(value = "public-keys", key = "#userId")
    })
    public void updatePublicKey(UUID userId, String publicKey) {
        User user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPublicKey(publicKey);
        userRepo.save(user);
    }

    @Async("taskExecutor")
    public void setOnlineStatus(UUID userId, boolean online) {
        userRepo.findById(userId).ifPresent(user -> {
            user.setOnline(online);
            userRepo.save(user);
        });
    }

    private String generateUsername(String displayName) {
        String base = displayName.toLowerCase().replaceAll("[^a-z0-9]", "").substring(0, Math.min(displayName.length(), 12));
        String candidate = base + "_" + UUID.randomUUID().toString().substring(0, 4);
        return userRepo.existsByUsername(candidate) ? base + "_" + UUID.randomUUID().toString().substring(0, 6) : candidate;
    }
}
