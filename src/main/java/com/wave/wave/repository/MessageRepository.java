package com.wave.wave.repository;

import com.wave.wave.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("SELECT m FROM Message m WHERE " +
           "((m.senderId = :userId1 AND m.receiverId = :userId2) OR " +
           "(m.senderId = :userId2 AND m.receiverId = :userId1)) " +
           "AND m.groupId IS NULL " +
           "ORDER BY m.timestamp ASC")
    List<Message> findConversation(@Param("userId1") String userId1,
                                   @Param("userId2") String userId2);

    @Query("SELECT m FROM Message m WHERE " +
           "((m.senderId = :userId1 AND m.receiverId = :userId2) OR " +
           "(m.senderId = :userId2 AND m.receiverId = :userId1)) " +
           "AND m.groupId IS NULL " +
           "ORDER BY m.timestamp DESC")
    Page<Message> findConversationPaged(@Param("userId1") String userId1,
                                        @Param("userId2") String userId2,
                                        Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.groupId = :groupId ORDER BY m.timestamp ASC")
    List<Message> findByGroupId(@Param("groupId") String groupId);

    @Query("SELECT m FROM Message m WHERE m.groupId = :groupId ORDER BY m.timestamp DESC")
    Page<Message> findByGroupIdPaged(@Param("groupId") String groupId, Pageable pageable);
}
