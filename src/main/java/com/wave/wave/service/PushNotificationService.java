package com.wave.wave.service;

import com.wave.wave.model.User;
import com.wave.wave.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Sends push notifications via Expo's Push API (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Expo handles FCM (Android) and APNS (iOS) routing for us — we just POST to their HTTPS endpoint.
 */
@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    @Autowired
    private UserRepository userRepo;

    private WebClient client;

    @PostConstruct
    public void init() {
        client = WebClient.builder()
                .baseUrl(EXPO_PUSH_URL)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Accept-Encoding", "gzip, deflate")
                .build();
    }

    /**
     * Send a DM notification to a user (if they have a registered push token).
     * Fire-and-forget — failures are logged, never bubbled up.
     */
    @Async("taskExecutor")
    public void sendDmNotification(String receiverUserId, String senderDisplayName, String messageType) {
        try {
            UUID uid = UUID.fromString(receiverUserId);
            User receiver = userRepo.findById(uid).orElse(null);
            if (receiver == null) return;
            String token = receiver.getExpoPushToken();
            if (token == null || token.isBlank()) return;

            String body = previewFor(messageType);
            send(token, senderDisplayName, body, Map.of(
                    "type", "dm",
                    "senderId", "",
                    "conversationWith", receiverUserId
            ));
        } catch (Exception e) {
            log.debug("sendDmNotification failed: {}", e.getMessage());
        }
    }

    /**
     * Send a clan-message notification to a recipient.
     */
    @Async("taskExecutor")
    public void sendClanNotification(String receiverUserId, String clanName, String senderDisplayName, String messageType) {
        try {
            UUID uid = UUID.fromString(receiverUserId);
            User receiver = userRepo.findById(uid).orElse(null);
            if (receiver == null) return;
            String token = receiver.getExpoPushToken();
            if (token == null || token.isBlank()) return;

            String title = clanName != null ? clanName : "Clan";
            String body = senderDisplayName + ": " + previewFor(messageType);
            send(token, title, body, Map.of("type", "clan"));
        } catch (Exception e) {
            log.debug("sendClanNotification failed: {}", e.getMessage());
        }
    }

    private String previewFor(String messageType) {
        if ("IMAGE".equals(messageType)) return "\uD83D\uDCF7 Photo";
        if ("FILE".equals(messageType))  return "\uD83D\uDCC4 File";
        return "New message";
    }

    private void send(String expoToken, String title, String body, Map<String, Object> data) {
        try {
            Map<String, Object> payload = Map.of(
                    "to", expoToken,
                    "sound", "default",
                    "title", title,
                    "body", body,
                    "data", data,
                    "priority", "high",
                    "channelId", "default"
            );
            client.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.warn("Expo push failed for token {}...: {}",
                    expoToken.substring(0, Math.min(12, expoToken.length())), e.getMessage());
        }
    }
}
