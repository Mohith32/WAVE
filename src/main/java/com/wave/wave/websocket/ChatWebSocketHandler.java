package com.wave.wave.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wave.wave.model.GroupMember;
import com.wave.wave.model.Message;
import com.wave.wave.security.JwtUtil;
import com.wave.wave.service.GroupService;
import com.wave.wave.service.MessageService;
import com.wave.wave.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private MessageService messageService;

    @Autowired
    private GroupService groupService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = extractQueryParam(session, "token");
        if (token == null || !jwtUtil.isTokenValid(token)) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid or missing token"));
            return;
        }

        String userId = jwtUtil.extractUserId(token);
        session.getAttributes().put("userId", userId);
        sessions.put(userId, session);

        // update online status
        try {
            userService.setOnlineStatus(UUID.fromString(userId), true);
        } catch (Exception ignored) {}

        // broadcast online status to all connected users
        broadcastPresence(userId, true);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.has("type") ? json.get("type").asText() : "message";

        switch (type) {
            case "message":
                handleChatMessage(userId, json);
                break;
            case "group_message":
                handleGroupMessage(userId, json);
                break;
            case "typing":
                handleTypingIndicator(userId, json);
                break;
            case "read_receipt":
                handleReadReceipt(userId, json);
                break;
            default:
                break;
        }
    }

    private void handleChatMessage(String senderId, JsonNode json) throws Exception {
        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setReceiverId(json.get("receiverId").asText());
        msg.setEncryptedContent(json.has("encryptedContent") ? json.get("encryptedContent").asText() : null);
        msg.setEncryptedAesKey(json.has("encryptedAesKey") ? json.get("encryptedAesKey").asText() : null);
        msg.setIv(json.has("iv") ? json.get("iv").asText() : null);
        msg.setMessageType(json.has("messageType") ? json.get("messageType").asText() : "TEXT");
        msg.setFileName(json.has("fileName") ? json.get("fileName").asText() : null);
        msg.setFileUrl(json.has("fileUrl") ? json.get("fileUrl").asText() : null);
        msg.setFileSize(json.has("fileSize") ? json.get("fileSize").asLong() : null);
        msg.setTimestamp(LocalDateTime.now());

        Message saved = messageService.saveMessage(msg);

        String msgJson = objectMapper.writeValueAsString(Map.of(
                "type", "message",
                "data", saved
        ));

        // Send to receiver if online
        WebSocketSession receiverSession = sessions.get(msg.getReceiverId());
        if (receiverSession != null && receiverSession.isOpen()) {
            receiverSession.sendMessage(new TextMessage(msgJson));
        }

        // Send confirmation back to sender
        WebSocketSession senderSession = sessions.get(senderId);
        if (senderSession != null && senderSession.isOpen()) {
            senderSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                    "type", "message_sent",
                    "data", saved
            ))));
        }
    }

    private void handleGroupMessage(String senderId, JsonNode json) throws Exception {
        String groupId = json.get("groupId").asText();

        if (!groupService.isMember(groupId, senderId)) {
            return;
        }

        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setGroupId(groupId);
        msg.setEncryptedContent(json.has("encryptedContent") ? json.get("encryptedContent").asText() : null);
        msg.setEncryptedAesKey(json.has("encryptedAesKey") ? json.get("encryptedAesKey").asText() : null);
        msg.setIv(json.has("iv") ? json.get("iv").asText() : null);
        msg.setMessageType(json.has("messageType") ? json.get("messageType").asText() : "TEXT");
        msg.setFileName(json.has("fileName") ? json.get("fileName").asText() : null);
        msg.setFileUrl(json.has("fileUrl") ? json.get("fileUrl").asText() : null);
        msg.setFileSize(json.has("fileSize") ? json.get("fileSize").asLong() : null);
        msg.setTimestamp(LocalDateTime.now());

        Message saved = messageService.saveMessage(msg);

        String msgJson = objectMapper.writeValueAsString(Map.of(
                "type", "group_message",
                "data", saved
        ));

        // Send to all group members who are online
        List<GroupMember> members = groupService.getGroupMembers(groupId);
        for (GroupMember member : members) {
            WebSocketSession memberSession = sessions.get(member.getUserId());
            if (memberSession != null && memberSession.isOpen()) {
                memberSession.sendMessage(new TextMessage(msgJson));
            }
        }
    }

    private void handleTypingIndicator(String senderId, JsonNode json) throws Exception {
        String receiverId = json.has("receiverId") ? json.get("receiverId").asText() : null;
        String groupId = json.has("groupId") ? json.get("groupId").asText() : null;

        String payload = objectMapper.writeValueAsString(Map.of(
                "type", "typing",
                "senderId", senderId,
                "receiverId", receiverId != null ? receiverId : "",
                "groupId", groupId != null ? groupId : ""
        ));

        if (groupId != null) {
            List<GroupMember> members = groupService.getGroupMembers(groupId);
            for (GroupMember member : members) {
                if (!member.getUserId().equals(senderId)) {
                    WebSocketSession s = sessions.get(member.getUserId());
                    if (s != null && s.isOpen()) {
                        s.sendMessage(new TextMessage(payload));
                    }
                }
            }
        } else if (receiverId != null) {
            WebSocketSession s = sessions.get(receiverId);
            if (s != null && s.isOpen()) {
                s.sendMessage(new TextMessage(payload));
            }
        }
    }

    private void handleReadReceipt(String senderId, JsonNode json) throws Exception {
        String receiverId = json.has("receiverId") ? json.get("receiverId").asText() : null;
        if (receiverId != null) {
            WebSocketSession s = sessions.get(receiverId);
            if (s != null && s.isOpen()) {
                s.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                        "type", "read_receipt",
                        "readBy", senderId
                ))));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            sessions.remove(userId);
            try {
                userService.setOnlineStatus(UUID.fromString(userId), false);
            } catch (Exception ignored) {}
            broadcastPresence(userId, false);
        }
    }

    private void broadcastPresence(String userId, boolean online) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "type", "presence",
                    "userId", userId,
                    "online", online
            ));
            for (WebSocketSession s : sessions.values()) {
                if (s.isOpen()) {
                    s.sendMessage(new TextMessage(payload));
                }
            }
        } catch (Exception ignored) {}
    }

    private String extractQueryParam(WebSocketSession session, String param) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(param)) {
                return kv[1];
            }
        }
        return null;
    }
}
