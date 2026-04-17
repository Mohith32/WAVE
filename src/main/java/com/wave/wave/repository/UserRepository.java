package com.wave.wave.repository;

import com.wave.wave.model.User;
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

    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY u.displayName ASC")
    List<User> searchUsers(@Param("q") String query);
}
