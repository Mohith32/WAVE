CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_receiver
    ON messages (sender_id, receiver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_sender
    ON messages (receiver_id, sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_group_id
    ON messages (group_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_timestamp
    ON messages (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation
    ON messages (sender_id, receiver_id, timestamp DESC)
    WHERE group_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_user_id
    ON group_members (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_group_id
    ON group_members (group_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_members_group_user
    ON group_members (group_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
    ON users (email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_online
    ON users (online)
    WHERE online = TRUE;
