package com.wave.wave.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RedisMessageSubscriber implements MessageListener {

    @Autowired
    private ObjectMapper objectMapper;

    private ConcurrentHashMap<String, WebSocketSession> localSessions;

    public void setLocalSessions(ConcurrentHashMap<String, WebSocketSession> sessions) {
        this.localSessions = sessions;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        if (localSessions == null) return;
        try {
            String body = new String(message.getBody());
            JsonNode node = objectMapper.readTree(body);
            String targetUserId = node.has("targetUserId") ? node.get("targetUserId").asText() : null;
            String payload = node.has("payload") ? node.get("payload").asText() : null;
            if (targetUserId == null || payload == null) return;
            WebSocketSession session = localSessions.get(targetUserId);
            if (session != null && session.isOpen()) {
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
            }
        } catch (Exception e) {
            // ignore malformed redis messages
        }
    }
}
