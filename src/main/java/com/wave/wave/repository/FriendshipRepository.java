package com.wave.wave.repository;

import com.wave.wave.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {

    Optional<Friendship> findByRequesterIdAndAddresseeId(String requesterId, String addresseeId);

    List<Friendship> findByAddresseeIdAndStatus(String addresseeId, Friendship.Status status);

    List<Friendship> findByRequesterIdAndStatus(String requesterId, Friendship.Status status);

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requesterId = :userId OR f.addresseeId = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findAcceptedFriendships(@Param("userId") String userId);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM Friendship f WHERE " +
           "((f.requesterId = :u1 AND f.addresseeId = :u2) OR (f.requesterId = :u2 AND f.addresseeId = :u1)) " +
           "AND f.status = 'ACCEPTED'")
    boolean areFriends(@Param("u1") String u1, @Param("u2") String u2);

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requesterId = :u1 AND f.addresseeId = :u2) OR (f.requesterId = :u2 AND f.addresseeId = :u1)")
    Optional<Friendship> findBetween(@Param("u1") String u1, @Param("u2") String u2);
}
