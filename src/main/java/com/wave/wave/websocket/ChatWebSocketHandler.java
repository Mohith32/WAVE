package com.wave.wave.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wave.wave.model.GroupMember;
import com.wave.wave.model.Message;
import com.wave.wave.security.JwtUtil;
import com.wave.wave.service.FriendshipService;
import com.wave.wave.service.GroupService;
import com.wave.wave.service.MessageService;
import com.wave.wave.service.PushNotificationService;
import com.wave.wave.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import jakarta.annotation.PostConstruct;
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
    private FriendshipService friendshipService;

    @Autowired
    private PushNotificationService pushService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private RedisMessageSubscriber redisMessageSubscriber;

    @Value("${wave.websocket.redis-channel:wave:ws:messages}")
    private String redisChannel;

    private final ConcurrentHashMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        redisMessageSubscriber.setLocalSessions(sessions);
    }

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

        try {
            userService.setOnlineStatus(UUID.fromString(userId), true);
        } catch (Exception ignored) {}

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
            case "message" -> handleChatMessage(userId, json);
            case "group_message" -> handleGroupMessage(userId, json);
            case "typing" -> handleTypingIndicator(userId, json);
            case "read_receipt" -> handleReadReceipt(userId, json);
        }
    }

    private void handleChatMessage(String senderId, JsonNode json) throws Exception {
        String receiverId = json.get("receiverId").asText();
        if (!friendshipService.areFriends(senderId, receiverId)) return;

        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setReceiverId(receiverId);
        msg.setEncryptedContent(json.has("encryptedContent") ? json.get("encryptedContent").asText() : null);
        msg.setEncryptedAesKey(json.has("encryptedAesKey") ? json.get("encryptedAesKey").asText() : null);
        msg.setSenderEncryptedAesKey(json.has("senderEncryptedAesKey") ? json.get("senderEncryptedAesKey").asText() : null);
        msg.setIv(json.has("iv") ? json.get("iv").asText() : null);
        msg.setMessageType(json.has("messageType") ? json.get("messageType").asText() : "TEXT");
        msg.setFileName(json.has("fileName") ? json.get("fileName").asText() : null);
        msg.setFileUrl(json.has("fileUrl") ? json.get("fileUrl").asText() : null);
        msg.setFileSize(json.has("fileSize") ? json.get("fileSize").asLong() : null);
        msg.setTimestamp(LocalDateTime.now());

        Message saved = messageService.saveMessage(msg);

        String msgJson = objectMapper.writeValueAsString(Map.of("type", "message", "data", saved));
        String sentJson = objectMapper.writeValueAsString(Map.of("type", "message_sent", "data", saved));

        deliverOrPublish(msg.getReceiverId(), msgJson);
        deliverOrPublish(senderId, sentJson);

        // Push notification: if the receiver isn't connected locally, they may be
        // offline or on another instance. Send a push so their device gets notified.
        // (Duplicates with WS are filtered client-side when the chat is open.)
        if (!isLocallyConnected(msg.getReceiverId())) {
            String senderName = userService.findById(UUID.fromString(senderId))
                    .map(u -> u.getDisplayName())
                    .orElse("Someone");
            pushService.sendDmNotification(msg.getReceiverId(), senderName, msg.getMessageType());
        }
    }

    private boolean isLocallyConnected(String userId) {
        WebSocketSession s = sessions.get(userId);
        return s != null && s.isOpen();
    }

    private void handleGroupMessage(String senderId, JsonNode json) throws Exception {
        String groupId = json.get("groupId").asText();
        if (!groupService.isMember(groupId, senderId)) return;

        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setGroupId(groupId);
        msg.setEncryptedContent(json.has("encryptedContent") ? json.get("encryptedContent").asText() : null);
        msg.setEncryptedAesKey(json.has("encryptedAesKey") ? json.get("encryptedAesKey").asText() : null);
        msg.setSenderEncryptedAesKey(json.has("senderEncryptedAesKey") ? json.get("senderEncryptedAesKey").asText() : null);
        msg.setIv(json.has("iv") ? json.get("iv").asText() : null);
        msg.setMessageType(json.has("messageType") ? json.get("messageType").asText() : "TEXT");
        msg.setFileName(json.has("fileName") ? json.get("fileName").asText() : null);
        msg.setFileUrl(json.has("fileUrl") ? json.get("fileUrl").asText() : null);
        msg.setFileSize(json.has("fileSize") ? json.get("fileSize").asLong() : null);
        msg.setTimestamp(LocalDateTime.now());

        Message saved = messageService.saveMessage(msg);
        String msgJson = objectMapper.writeValueAsString(Map.of("type", "group_message", "data", saved));

        List<GroupMember> members = groupService.getGroupMembers(groupId);
        String senderName = userService.findById(UUID.fromString(senderId))
                .map(u -> u.getDisplayName()).orElse("Someone");
        String clanName = groupService.getGroup(UUID.fromString(groupId))
                .map(g -> g.getGroupName()).orElse("Clan");

        for (GroupMember member : members) {
            deliverOrPublish(member.getUserId(), msgJson);
            if (!member.getUserId().equals(senderId) && !isLocallyConnected(member.getUserId())) {
                pushService.sendClanNotification(member.getUserId(), clanName, senderName, msg.getMessageType());
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

        if (groupId != null && !groupId.isEmpty()) {
            List<GroupMember> members = groupService.getGroupMembers(groupId);
            for (GroupMember member : members) {
                if (!member.getUserId().equals(senderId)) {
                    deliverOrPublish(member.getUserId(), payload);
                }
            }
        } else if (receiverId != null && !receiverId.isEmpty()) {
            if (friendshipService.areFriends(senderId, receiverId)) {
                deliverOrPublish(receiverId, payload);
            }
        }
    }

    private void handleReadReceipt(String senderId, JsonNode json) throws Exception {
        String receiverId = json.has("receiverId") ? json.get("receiverId").asText() : null;
        if (receiverId != null && friendshipService.areFriends(senderId, receiverId)) {
            String payload = objectMapper.writeValueAsString(Map.of("type", "read_receipt", "readBy", senderId));
            deliverOrPublish(receiverId, payload);
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

    private void deliverOrPublish(String targetUserId, String payload) {
        WebSocketSession localSession = sessions.get(targetUserId);
        if (localSession != null && localSession.isOpen()) {
            try {
                synchronized (localSession) {
                    localSession.sendMessage(new TextMessage(payload));
                }
            } catch (Exception e) {
                publishToRedis(targetUserId, payload);
            }
        } else {
            publishToRedis(targetUserId, payload);
        }
    }

    private void publishToRedis(String targetUserId, String payload) {
        try {
            String envelope = objectMapper.writeValueAsString(Map.of(
                    "targetUserId", targetUserId,
                    "payload", payload
            ));
            redisTemplate.convertAndSend(redisChannel, envelope);
        } catch (Exception ignored) {}
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
                    try {
                        synchronized (s) {
                            s.sendMessage(new TextMessage(payload));
                        }
                    } catch (Exception ignored) {}
                }
            }
            redisTemplate.convertAndSend(redisChannel, objectMapper.writeValueAsString(Map.of(
                    "targetUserId", "__broadcast__presence__",
                    "payload", payload
            )));
        } catch (Exception ignored) {}
    }

    private String extractQueryParam(WebSocketSession session, String param) {
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query == null) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(param)) return kv[1];
        }
        return null;
    }
}
