package com.wave.wave.service;

import com.wave.wave.dto.LoginRequest;
import com.wave.wave.dto.LoginResponse;
import com.wave.wave.dto.RegisterRequest;
import com.wave.wave.exception.UserAlreadyExistsException;
import com.wave.wave.model.User;
import com.wave.wave.repository.UserRepository;
import com.wave.wave.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
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

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setPublicKey(request.getPublicKey());

        return userRepo.save(user);
    }

    public LoginResponse loginUser(LoginRequest request) {
        User user = userRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(user.getUserId().toString(), user.getEmail());

        return new LoginResponse(
                token,
                user.getUserId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                user.getPublicKey()
        );
    }

    public Optional<User> findById(UUID userId) {
        return userRepo.findById(userId);
    }

    public Optional<User> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public void updatePublicKey(UUID userId, String publicKey) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPublicKey(publicKey);
        userRepo.save(user);
    }

    public void setOnlineStatus(UUID userId, boolean online) {
        userRepo.findById(userId).ifPresent(user -> {
            user.setOnline(online);
            userRepo.save(user);
        });
    }
}
