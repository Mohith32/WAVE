package com.wave.wave.controller;

import com.wave.wave.dto.ApiResponse;
import com.wave.wave.service.FriendshipService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendshipController {

    @Autowired
    private FriendshipService friendshipService;

    private String me() {
        return SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
    }

    @PostMapping("/request/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendRequest(@PathVariable String userId) {
        var f = friendshipService.sendRequest(me(), userId);
        return ResponseEntity.ok(ApiResponse.ok("Request sent", Map.of(
                "status", f.getStatus().name(),
                "friendshipId", f.getId().toString()
        )));
    }

    @PutMapping("/accept/{requesterId}")
    public ResponseEntity<ApiResponse<Void>> accept(@PathVariable String requesterId) {
        friendshipService.accept(requesterId, me());
        return ResponseEntity.ok(ApiResponse.ok("Friend request accepted"));
    }

    @PutMapping("/reject/{requesterId}")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable String requesterId) {
        friendshipService.reject(requesterId, me());
        return ResponseEntity.ok(ApiResponse.ok("Friend request rejected"));
    }

    @DeleteMapping("/unfriend/{userId}")
    public ResponseEntity<ApiResponse<Void>> unfriend(@PathVariable String userId) {
        friendshipService.unfriend(me(), userId);
        return ResponseEntity.ok(ApiResponse.ok("Unfriended"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFriends() {
        return ResponseEntity.ok(ApiResponse.ok("Friends fetched", friendshipService.getFriends(me())));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPending() {
        return ResponseEntity.ok(ApiResponse.ok("Pending requests", friendshipService.getPendingRequests(me())));
    }

    @GetMapping("/status/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.ok("Status", friendshipService.getStatus(me(), userId)));
    }
}
