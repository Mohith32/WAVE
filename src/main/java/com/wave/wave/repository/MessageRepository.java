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

    /**
     * Returns the latest 1:1 message per conversation partner, newest first.
     * Use result.senderId/receiverId to derive the peer relative to :me.
     * Limited to ~200 rows by Pageable caller — that's way more than any real user
     * has conversations, and lets the service dedupe in-memory.
     */
    @Query("SELECT m FROM Message m WHERE m.groupId IS NULL " +
           "AND (m.senderId = :me OR m.receiverId = :me) " +
           "ORDER BY m.timestamp DESC")
    List<Message> findRecentOneToOneMessages(@Param("me") String me, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM Message m WHERE m.groupId IS NULL AND " +
           "((m.senderId = :userId1 AND m.receiverId = :userId2) OR " +
           " (m.senderId = :userId2 AND m.receiverId = :userId1))")
    int deleteConversation(@Param("userId1") String userId1, @Param("userId2") String userId2);
}
