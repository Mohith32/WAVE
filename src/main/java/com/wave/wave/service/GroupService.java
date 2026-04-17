package com.wave.wave.service;

import com.wave.wave.model.ChatGroup;
import com.wave.wave.model.GroupMember;
import com.wave.wave.repository.GroupMemberRepository;
import com.wave.wave.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GroupService {

    @Autowired
    private GroupRepository groupRepo;

    @Autowired
    private GroupMemberRepository memberRepo;

    @CacheEvict(value = "user-groups", allEntries = true)
    public ChatGroup createGroup(String groupName, String description, String creatorUserId, List<String> memberIds) {
        ChatGroup group = new ChatGroup();
        group.setGroupName(groupName);
        group.setDescription(description);
        group.setCreatedBy(creatorUserId);
        group.setCreatedAt(LocalDateTime.now());
        group = groupRepo.save(group);
        String groupId = group.getGroupId().toString();
        memberRepo.save(new GroupMember(groupId, creatorUserId, GroupMember.Role.ADMIN));
        if (memberIds != null) {
            for (String memberId : memberIds) {
                if (!memberId.equals(creatorUserId)) {
                    memberRepo.save(new GroupMember(groupId, memberId, GroupMember.Role.MEMBER));
                }
            }
        }
        return group;
    }

    public Optional<ChatGroup> getGroup(UUID groupId) {
        return groupRepo.findById(groupId);
    }

    @Cacheable(value = "user-groups", key = "#userId")
    public List<ChatGroup> getUserGroups(String userId) {
        List<GroupMember> memberships = memberRepo.findByUserId(userId);
        return memberships.stream()
                .map(m -> groupRepo.findById(UUID.fromString(m.getGroupId())).orElse(null))
                .filter(g -> g != null)
                .toList();
    }

    @Cacheable(value = "group-members", key = "#groupId")
    public List<GroupMember> getGroupMembers(String groupId) {
        return memberRepo.findByGroupId(groupId);
    }

    @Caching(evict = {
            @CacheEvict(value = "group-members", key = "#groupId"),
            @CacheEvict(value = "user-groups", allEntries = true)
    })
    public void addMember(String groupId, String userId) {
        if (!memberRepo.existsByGroupIdAndUserId(groupId, userId)) {
            memberRepo.save(new GroupMember(groupId, userId, GroupMember.Role.MEMBER));
        }
    }

    @Caching(evict = {
            @CacheEvict(value = "group-members", key = "#groupId"),
            @CacheEvict(value = "user-groups", allEntries = true)
    })
    @Transactional
    public void removeMember(String groupId, String userId) {
        memberRepo.deleteByGroupIdAndUserId(groupId, userId);
    }

    public boolean isMember(String groupId, String userId) {
        return memberRepo.existsByGroupIdAndUserId(groupId, userId);
    }
}
