package com.wave.wave.service;

import com.wave.wave.config.OtpProperties;
import com.wave.wave.model.EmailVerification;
import com.wave.wave.repository.EmailVerificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private EmailVerificationRepository repo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OtpProperties props;

    @Transactional
    public void generateAndSend(String rawEmail) {
        String email = normalize(rawEmail);
        // Kill any stale unverified records
        repo.deleteUnverifiedByEmail(email);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerification ev = new EmailVerification();
        ev.setEmail(email);
        ev.setCode(code);
        ev.setCreatedAt(LocalDateTime.now());
        ev.setExpiresAt(LocalDateTime.now().plusMinutes(props.getExpirationMinutes()));
        ev.setVerified(false);
        ev.setAttempts(0);
        repo.save(ev);

        emailService.sendOtp(email, code);
    }

    @Transactional
    public VerifyResult verify(String rawEmail, String code) {
        String email = normalize(rawEmail);
        Optional<EmailVerification> opt = repo.findLatestUnverified(email, LocalDateTime.now());
        if (opt.isEmpty()) return VerifyResult.NO_PENDING;

        EmailVerification ev = opt.get();
        if (ev.getAttempts() >= props.getMaxAttempts()) {
            repo.delete(ev);
            return VerifyResult.TOO_MANY_ATTEMPTS;
        }

        if (!ev.getCode().equals(code)) {
            ev.setAttempts(ev.getAttempts() + 1);
            repo.save(ev);
            return VerifyResult.INVALID;
        }

        ev.setVerified(true);
        repo.save(ev);
        return VerifyResult.OK;
    }

    public boolean isEmailVerifiedRecently(String rawEmail) {
        if (!props.isRequireVerification()) return true;
        String email = normalize(rawEmail);
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(props.getVerifiedWindowMinutes());
        return repo.hasRecentVerified(email, cutoff);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public enum VerifyResult {
        OK, INVALID, NO_PENDING, TOO_MANY_ATTEMPTS
    }
}
