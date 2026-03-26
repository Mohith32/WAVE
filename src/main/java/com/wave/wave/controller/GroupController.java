package com.wave.wave.controller;

import com.wave.wave.dto.ApiResponse;
import com.wave.wave.dto.GroupCreateRequest;
import com.wave.wave.model.ChatGroup;
import com.wave.wave.model.GroupMember;
import com.wave.wave.service.GroupService;
import com.wave.wave.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private GroupService groupService;

    @Autowired
    private UserService userService;

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createGroup(@Valid @RequestBody GroupCreateRequest request) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
        ChatGroup group = groupService.createGroup(
                request.getGroupName(),
                request.getDescription(),
                userId,
                request.getMemberIds()
        );
        return ResponseEntity.ok(ApiResponse.ok("Group created", Map.of(
                "groupId", group.getGroupId().toString(),
                "groupName", group.getGroupName()
        )));
    }

    @GetMapping("/my-groups")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyGroups() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getPrincipal().toString();
        List<Map<String, Object>> groups = groupService.getUserGroups(userId).stream()
                .map(g -> Map.<String, Object>of(
                        "groupId", g.getGroupId().toString(),
                        "groupName", g.getGroupName(),
                        "description", g.getDescription() != null ? g.getDescription() : "",
                        "createdBy", g.getCreatedBy()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Groups fetched", groups));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGroupMembers(@PathVariable String groupId) {
        List<GroupMember> members = groupService.getGroupMembers(groupId);
        List<Map<String, Object>> membersList = members.stream()
                .map(m -> {
                    var user = userService.findById(UUID.fromString(m.getUserId()));
                    return Map.<String, Object>of(
                            "userId", m.getUserId(),
                            "role", m.getRole().toString(),
                            "displayName", user.map(u -> u.getDisplayName()).orElse("Unknown"),
                            "publicKey", user.map(u -> u.getPublicKey() != null ? u.getPublicKey() : "").orElse("")
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Members fetched", membersList));
    }

    @PostMapping("/{groupId}/add-member")
    public ResponseEntity<ApiResponse<Void>> addMember(@PathVariable String groupId, @RequestBody Map<String, String> body) {
        groupService.addMember(groupId, body.get("userId"));
        return ResponseEntity.ok(ApiResponse.ok("Member added"));
    }

    @DeleteMapping("/{groupId}/remove-member/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(@PathVariable String groupId, @PathVariable String userId) {
        groupService.removeMember(groupId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Member removed"));
    }
}
