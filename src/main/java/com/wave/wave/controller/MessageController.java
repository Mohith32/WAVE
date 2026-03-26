package com.wave.wave.controller;

import com.wave.wave.dto.ApiResponse;
import com.wave.wave.model.Message;
import com.wave.wave.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Message>> sendMessage(@RequestBody Message message) {
        Message saved = messageService.saveMessage(message);
        return ResponseEntity.ok(ApiResponse.ok("Message sent", saved));
    }

    @GetMapping("/conversation")
    public ResponseEntity<ApiResponse<List<Message>>> getConversation(
            @RequestParam String userId1,
            @RequestParam String userId2) {
        List<Message> messages = messageService.getConversation(userId1, userId2);
        return ResponseEntity.ok(ApiResponse.ok("Messages fetched", messages));
    }

    @GetMapping("/conversation/paged")
    public ResponseEntity<ApiResponse<Page<Message>>> getConversationPaged(
            @RequestParam String userId1,
            @RequestParam String userId2,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<Message> messages = messageService.getConversationPaged(userId1, userId2, page, size);
        return ResponseEntity.ok(ApiResponse.ok("Messages fetched", messages));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<List<Message>>> getGroupMessages(@PathVariable String groupId) {
        List<Message> messages = messageService.getGroupMessages(groupId);
        return ResponseEntity.ok(ApiResponse.ok("Group messages fetched", messages));
    }
}
