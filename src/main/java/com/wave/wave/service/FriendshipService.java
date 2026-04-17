package com.wave.wave.service;

import com.wave.wave.model.Friendship;
import com.wave.wave.model.User;
import com.wave.wave.repository.FriendshipRepository;
import com.wave.wave.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FriendshipService {

    @Autowired
    private FriendshipRepository friendshipRepo;

    @Autowired
    private UserRepository userRepo;

    @Caching(evict = {
            @CacheEvict(value = "friends", key = "#requesterId"),
            @CacheEvict(value = "friends", key = "#addresseeId"),
            @CacheEvict(value = "pending-requests", key = "#addresseeId"),
            @CacheEvict(value = "friendship-status", allEntries = true)
    })
    public Friendship sendRequest(String requesterId, String addresseeId) {
        if (requesterId.equals(addresseeId)) throw new IllegalArgumentException("Cannot add yourself");
        Optional<Friendship> existing = friendshipRepo.findBetween(requesterId, addresseeId);
        if (existing.isPresent()) return existing.get();
        Friendship f = new Friendship();
        f.setRequesterId(requesterId);
        f.setAddresseeId(addresseeId);
        return friendshipRepo.save(f);
    }

    @Caching(evict = {
            @CacheEvict(value = "friends", key = "#requesterId"),
            @CacheEvict(value = "friends", key = "#addresseeId"),
            @CacheEvict(value = "pending-requests", key = "#addresseeId"),
            @CacheEvict(value = "friendship-status", allEntries = true)
    })
    public Friendship accept(String requesterId, String addresseeId) {
        Friendship f = friendshipRepo.findByRequesterIdAndAddresseeId(requesterId, addresseeId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        f.setStatus(Friendship.Status.ACCEPTED);
        return friendshipRepo.save(f);
    }

    @Caching(evict = {
            @CacheEvict(value = "pending-requests", key = "#addresseeId"),
            @CacheEvict(value = "friendship-status", allEntries = true)
    })
    public Friendship reject(String requesterId, String addresseeId) {
        Friendship f = friendshipRepo.findByRequesterIdAndAddresseeId(requesterId, addresseeId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        f.setStatus(Friendship.Status.REJECTED);
        return friendshipRepo.save(f);
    }

    @Caching(evict = {
            @CacheEvict(value = "friends", key = "#userId"),
            @CacheEvict(value = "friends", key = "#otherId"),
            @CacheEvict(value = "friendship-status", allEntries = true)
    })
    public void unfriend(String userId, String otherId) {
        friendshipRepo.findBetween(userId, otherId).ifPresent(friendshipRepo::delete);
    }

    @Cacheable(value = "friends", key = "#userId")
    public List<Map<String, Object>> getFriends(String userId) {
        return friendshipRepo.findAcceptedFriendships(userId).stream()
                .map(f -> {
                    String friendId = f.getRequesterId().equals(userId) ? f.getAddresseeId() : f.getRequesterId();
                    return userRepo.findById(UUID.fromString(friendId)).map(u -> buildUserMap(u, "FRIEND")).orElse(null);
                })
                .filter(m -> m != null)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "pending-requests", key = "#userId")
    public List<Map<String, Object>> getPendingRequests(String userId) {
        return friendshipRepo.findByAddresseeIdAndStatus(userId, Friendship.Status.PENDING).stream()
                .map(f -> userRepo.findById(UUID.fromString(f.getRequesterId()))
                        .map(u -> {
                            var map = buildUserMap(u, "PENDING");
                            map.put("friendshipId", f.getId().toString());
                            return map;
                        }).orElse(null))
                .filter(m -> m != null)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getStatus(String userId, String otherId) {
        Optional<Friendship> f = friendshipRepo.findBetween(userId, otherId);
        if (f.isEmpty()) return Map.of("status", "NONE");
        Friendship friendship = f.get();
        String status = friendship.getStatus().name();
        boolean isSender = friendship.getRequesterId().equals(userId);
        return Map.of("status", status, "isSender", isSender, "friendshipId", friendship.getId().toString());
    }

    public boolean areFriends(String u1, String u2) {
        return friendshipRepo.areFriends(u1, u2);
    }

    private java.util.HashMap<String, Object> buildUserMap(User u, String rel) {
        var map = new java.util.HashMap<String, Object>();
        map.put("userId", u.getUserId().toString());
        map.put("displayName", u.getDisplayName());
        map.put("username", u.getUsername() != null ? u.getUsername() : "");
        map.put("online", u.isOnline());
        map.put("publicKey", u.getPublicKey() != null ? u.getPublicKey() : "");
        map.put("relationship", rel);
        return map;
    }
}
