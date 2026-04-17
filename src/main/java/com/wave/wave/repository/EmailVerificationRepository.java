package com.wave.wave.repository;

import com.wave.wave.model.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {

    @Query("SELECT v FROM EmailVerification v WHERE v.email = :email AND v.verified = false AND v.expiresAt > :now ORDER BY v.createdAt DESC")
    Optional<EmailVerification> findLatestUnverified(@Param("email") String email, @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(v) > 0 FROM EmailVerification v WHERE v.email = :email AND v.verified = true AND v.createdAt > :cutoff")
    boolean hasRecentVerified(@Param("email") String email, @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM EmailVerification v WHERE v.email = :email AND v.verified = false")
    void deleteUnverifiedByEmail(@Param("email") String email);

    @Modifying
    @Query("DELETE FROM EmailVerification v WHERE v.expiresAt < :cutoff")
    void deleteExpired(@Param("cutoff") LocalDateTime cutoff);
}
