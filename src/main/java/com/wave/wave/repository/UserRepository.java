package com.wave.wave.repository;

import com.wave.wave.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    /**
     * Substring match on username or displayName (case-insensitive).
     * Prefix matches rank higher — we surface "alice" before "dealice"
     * when user types "a".
     */
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username)    LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY " +
           "  CASE WHEN LOWER(u.username)    LIKE LOWER(CONCAT(:q, '%')) THEN 0 " +
           "       WHEN LOWER(u.displayName) LIKE LOWER(CONCAT(:q, '%')) THEN 1 " +
           "       ELSE 2 END, " +
           "  u.displayName ASC")
    List<User> searchUsers(@Param("q") String query, Pageable pageable);
}
