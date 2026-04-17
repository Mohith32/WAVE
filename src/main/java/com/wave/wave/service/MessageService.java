package com.wave.wave.service;

import com.wave.wave.model.Message;
import com.wave.wave.model.User;
import com.wave.wave.repository.MessageRepository;
import com.wave.wave.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepo;

    @Autowired
    private UserRepository userRepo;

    public Message saveMessage(Message message) {
        if (message.getTimestamp() == null) {
            message.setTimestamp(LocalDateTime.now());
        }
        return messageRepo.save(message);
    }

    public List<Message> getConversation(String userId1, String userId2) {
        return messageRepo.findConversation(userId1, userId2);
    }

    public Page<Message> getConversationPaged(String userId1, String userId2, int page, int size) {
        return messageRepo.findConversationPaged(userId1, userId2,
                PageRequest.of(page, size, Sort.by("timestamp").descending()));
    }

    public List<Message> getGroupMessages(String groupId) {
        return messageRepo.findByGroupId(groupId);
    }

    @org.springframework.transaction.annotation.Transactional
    public int clearConversation(String userId1, String userId2) {
        return messageRepo.deleteConversation(userId1, userId2);
    }

    public Page<Message> getGroupMessagesPaged(String groupId, int page, int size) {
        return messageRepo.findByGroupIdPaged(groupId,
                PageRequest.of(page, size, Sort.by("timestamp").descending()));
    }

    /**
     * Returns recent 1:1 conversation partners with the last message timestamp + type.
     * Ordered by most recent first.
     */
    public List<Map<String, Object>> getRecentConversations(String myId) {
        List<Message> recent = messageRepo.findRecentOneToOneMessages(
                myId, PageRequest.of(0, 200));

        // Walk newest-first, first hit per peer wins
        Set<String> seen = new HashSet<>();
        Map<String, Message> peerToLastMsg = new LinkedHashMap<>();
        for (Message m : recent) {
            String peerId = myId.equals(m.getSenderId()) ? m.getReceiverId() : m.getSenderId();
            if (peerId == null || peerId.isBlank()) continue;
            if (seen.add(peerId)) peerToLastMsg.put(peerId, m);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Message> e : peerToLastMsg.entrySet()) {
            String peerId = e.getKey();
            Message last = e.getValue();
            UUID peerUuid;
            try { peerUuid = UUID.fromString(peerId); }
            catch (IllegalArgumentException ex) { continue; }

            userRepo.findById(peerUuid).ifPresent(u -> {
                Map<String, Object> row = new java.util.HashMap<>();
                row.put("userId", u.getUserId().toString());
                row.put("displayName", u.getDisplayName());
                row.put("username", u.getUsername() != null ? u.getUsername() : "");
                row.put("online", u.isOnline());
                row.put("publicKey", u.getPublicKey() != null ? u.getPublicKey() : "");
                row.put("lastMessageAt", last.getTimestamp().toString());
                row.put("lastMessageType", last.getMessageType() != null ? last.getMessageType() : "TEXT");
                row.put("iSentLast", myId.equals(last.getSenderId()));
                result.add(row);
            });
        }
        return result;
    }
}
