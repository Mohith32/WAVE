ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_encrypted_aes_key TEXT;
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

UPDATE users SET username = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]', '', 'g')) || '_' || substring(user_id::text, 1, 5) WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id VARCHAR(255) NOT NULL,
    addressee_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uq_friendship UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);
