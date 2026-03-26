package com.wave.wave.service;

import com.wave.wave.model.Message;
import com.wave.wave.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepo;

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

    public Page<Message> getGroupMessagesPaged(String groupId, int page, int size) {
        return messageRepo.findByGroupIdPaged(groupId,
                PageRequest.of(page, size, Sort.by("timestamp").descending()));
    }
}
