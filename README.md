# WAVE — End-to-End Encrypted Chat Platform

![Status](https://img.shields.io/badge/Status-Live-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Backend](https://img.shields.io/badge/Backend-Spring_Boot_3.5-brightgreen) ![Mobile](https://img.shields.io/badge/Mobile-Expo_SDK_54-blueviolet)

WAVE is a real-time, end-to-end encrypted messaging platform with 1:1 DMs and group ("Clans") chat. Spring Boot backend + React Native (Expo) mobile app, deployed on free-tier cloud services.

**Live backend:** [wave-1a21.onrender.com](https://wave-1a21.onrender.com) · [`/actuator/health`](https://wave-1a21.onrender.com/actuator/health)

---

## Architecture

```
┌─────────────────┐      REST + WebSocket      ┌──────────────────┐
│  React Native   │ ◄────────────────────────► │  Spring Boot 3.5 │
│  (Expo SDK 54)  │      wss:// /chat          │    Java 17       │
└─────────────────┘                             └──────────────────┘
                                                  │     │     │
                                                  ▼     ▼     ▼
                                        ┌─────────┐ ┌────────┐ ┌────────┐
                                        │Postgres │ │ Redis  │ │Supabase│
                                        │(Supabase│ │(Upstash│ │Storage │
                                        │ Pooler) │ │ TLS)   │ │(files) │
                                        └─────────┘ └────────┘ └────────┘
                                                       │
                                            Pub/Sub for cross-instance
                                            WebSocket message routing
```

**Division of work**
- **Backend** — hand-written Spring Boot: controllers, services, repositories, security filters, WebSocket handler, Redis pub/sub, Supabase storage integration, email OTP, rate limiting
- **Frontend** — React Native (Expo) with AI-assisted UI; hand-curated iOS-native aesthetic, state management, real-time message decryption, expo-notifications integration

---

## Tech Stack

### Backend (Spring Boot 3.5 · Java 17)

| Layer | Technology | Notes |
|---|---|---|
| Framework | Spring Boot 3.5, Spring Web, Spring Data JPA | Layered (Controller → Service → Repository) |
| Realtime | Spring WebSockets + Redis Pub/Sub | Horizontally scalable across instances |
| Auth | JWT (HS512, 24 h) + BCrypt (cost 12) | Stateless |
| Email | JavaMail + Brevo SMTP | OTP email verification on signup |
| Cache | Spring Cache `@Cacheable` + Redis | Users, friends, groups, conversations |
| Rate limit | Bucket4j (token bucket per IP) | Login, register, upload |
| Storage | Supabase Storage (default) or local FS | Pluggable via `STORAGE_BACKEND` env |
| Push | Expo Push API (via WebClient) | Fires when recipient offline |
| Health | Spring Actuator | `/actuator/health` for platform probes |
| Containerization | Multi-stage Docker | Temurin 17 Alpine |

### Frontend (React Native · Expo SDK 54)

| Purpose | Library |
|---|---|
| Routing | `expo-router` (file-based) |
| Storage | `expo-secure-store` (OS keychain) |
| Media | `expo-image-picker`, `expo-image` |
| Notifications | `expo-notifications` (+ `expo-device`) |
| Real-time | Native `WebSocket` with exponential-backoff reconnect + offline queue |
| Crypto | Local AES + public-key key exchange utils |
| Typography | Inter (via `@expo-google-fonts/inter`) |

### Deployment

| Service | Tier | Purpose |
|---|---|---|
| **Render** | Free | Backend Docker container |
| **Supabase** | Free | PostgreSQL DB + Storage bucket |
| **Upstash** | Free | Redis (TLS) |
| **Brevo** | Free (300 / day) | Transactional email (OTP) |
| **Expo** | Free | Push token routing |

---

## Security & Cryptography (E2EE)

- **Asymmetric key pair** — generated on-device at registration; public key uploaded, private key stored in the OS keychain via `expo-secure-store` and never leaves the device.
- **Per-message AES** — each outbound message generates a fresh AES key + IV. The body is encrypted with AES; the AES key is sealed with the recipient's public key.
- **Zero-knowledge server** — the backend only persists ciphertext (`encryptedContent`, `encryptedAesKey`, `iv`); it cannot decrypt messages.
- **Email OTP** — 6-digit code via Brevo SMTP required to complete registration. OTPs stored in DB with expiry + attempt count, consumed on verify.
- **Rate limiting** — per-IP token bucket on auth + upload endpoints (configurable capacity + refill window).
- **Secrets** — all credentials via env vars; `.env` gitignored; no secrets in repo history.

---

## Features

- **1:1 DMs** with real-time delivery, typing indicator, read receipts, and presence
- **Clans** (group chats) with member management
- **Friends / Contacts** system with pending requests, prefix-ranked search, and per-user actions
- **Image sharing** via Supabase Storage (public bucket) with 302-redirect download
- **Push notifications** (Expo Push) when offline + in-app foreground banners
- **Per-peer mute** (local-only preference)
- **Clear chat** — mutual deletion of 1:1 history
- **Theme** — iOS-native light + dark, follows system by default
- **Email verification** required before account creation

---

## Local Setup

### Prerequisites
- Java 17+
- Node.js 18+ with npm
- Docker (optional, for container testing)
- Free accounts: [Supabase](https://supabase.com), [Upstash](https://upstash.com), [Brevo](https://brevo.com)

### 1. Clone + configure environment
```bash
git clone https://github.com/Mohith32/WAVE.git
cd WAVE
cp .env.example .env
# Edit .env with your Supabase, Upstash, Brevo credentials
```

See [`.env.example`](.env.example) for the full list of variables.

### 2. Run backend
```bash
# Windows PowerShell
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```
Server starts on `http://localhost:8080`. Hibernate auto-creates schema on first run (`spring.jpa.hibernate.ddl-auto=update`).

### 3. Run mobile app
```bash
cd wave-app
npm install
npx expo start -c
```
- Update [`wave-app/utils/api.js`](wave-app/utils/api.js) with your machine's LAN IP (`ipconfig` / `ifconfig`) or the deployed Render URL.
- Scan the QR with **Expo Go** on your phone.

---

## Deployment (Render — free tier)

1. Fork/push the repo to GitHub.
2. Create a new **Web Service** on Render, connect your repo.
3. Render auto-detects the `Dockerfile`. Use **free** instance type.
4. Set **Health Check Path** → `/actuator/health`.
5. Add all env vars from `.env.example` (see below).
6. First deploy takes ~8 min (Docker build). Subsequent deploys are faster.

**Critical env vars on Render:**
```
DB_URL=jdbc:postgresql://aws-1-<region>.pooler.supabase.com:5432/postgres
DB_USERNAME=postgres.<project-ref>        # Session-mode pooler user
DB_PASSWORD=<supabase-db-password>
REDIS_HOST=<your>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-token>
REDIS_SSL=true
JWT_SECRET=<64+ random chars for HS512>
STORAGE_BACKEND=supabase
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
SUPABASE_BUCKET=wave-uploads
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=<brevo-smtp-login>
MAIL_PASSWORD=<brevo-smtp-password>
MAIL_FROM=<verified-brevo-sender>
MAIL_FROM_NAME=Wave
```

**Notes**
- Use Supabase **Session Pooler** (port 5432, user `postgres.<ref>`) — the direct connection is IPv6-only and Render's free tier is IPv4-only.
- Render free tier sleeps after 15 min idle; first request after wake takes ~30-60 s (API timeout is set to 75 s for this reason).

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/request-otp` | — | Send OTP to email |
| `POST` | `/api/auth/verify-otp` | — | Verify 6-digit OTP |
| `POST` | `/api/auth/register` | — | Create account (requires recent OTP verify) |
| `POST` | `/api/auth/login` | — | Authenticate → JWT |
| `GET` | `/api/auth/users` | JWT | List all users |
| `GET` | `/api/auth/user/{id}` | JWT | Single user + public key |
| `GET` | `/api/auth/search?q=` | JWT | Prefix-ranked user search (cap 20) |
| `PUT` | `/api/auth/public-key` | JWT | Update device public key |
| `PUT` | `/api/auth/push-token` | JWT | Register Expo push token |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages/conversation/paged?userId1&userId2&page&size` | Paged 1:1 history (max size 100) |
| `GET` | `/api/messages/group/{groupId}` | Group message history |
| `GET` | `/api/messages/conversations` | Recent DM partners (for DMs tab) |
| `DELETE` | `/api/messages/conversation/{userId}` | Clear chat with user (both sides) |

### Groups (Clans)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/groups/create` | Create clan with initial members |
| `GET` | `/api/groups/my-groups` | User's clans |
| `GET` | `/api/groups/{id}/members` | Clan members with public keys |
| `POST` | `/api/groups/{id}/add-member` | Add a mate |
| `DELETE` | `/api/groups/{id}/remove-member/{userId}` | Remove a mate |

### Friends
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/friends` | Accepted friends (cached) |
| `GET` | `/api/friends/pending` | Incoming requests |
| `POST` | `/api/friends/request/{userId}` | Send request |
| `PUT` | `/api/friends/accept/{requesterId}` | Accept |
| `PUT` | `/api/friends/reject/{requesterId}` | Reject |
| `DELETE` | `/api/friends/unfriend/{userId}` | Remove |
| `GET` | `/api/friends/status/{userId}` | NONE / PENDING / ACCEPTED |

### Files
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/files/upload` | Upload to Supabase Storage (50 MB max) |
| `GET` | `/api/files/{fileName}` | 302 redirect to Supabase public URL |

### Actuator
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/actuator/health` | Platform health probe |

---

## WebSocket Protocol (`wss://<host>/chat?token=<jwt>`)

Server authenticates via JWT in the query string, then both sides exchange JSON frames.

| `type` | Direction | Payload |
|---|---|---|
| `message` | client ↔ server | `{ receiverId, encryptedContent, encryptedAesKey, senderEncryptedAesKey, iv, messageType }` |
| `group_message` | client ↔ server | Same + `groupId` (no receiverId) |
| `typing` | client ↔ server | `{ receiverId?, groupId? }` |
| `read_receipt` | client ↔ server | `{ receiverId }` |
| `presence` | server → client | `{ userId, online }` (broadcast on connect / disconnect) |
| `message_sent` | server → client | Delivery confirmation to sender |

**Scaling:** when a message's recipient isn't connected to the current backend instance, the server publishes an envelope to Redis channel `wave:ws:messages`. Each instance subscribes and forwards the payload to its local session map if matched. Enables horizontal scaling with zero code changes.

---

## Performance Tuning

- **HikariCP** — tuned pool sizes via env (`DB_POOL_MAX`, `DB_POOL_MIN_IDLE`); leak detection at 60 s
- **Redis cache** (`@Cacheable`) — user lookups, friend lists, pending requests, group members, conversation partners
- **Pagination** — hard cap of 100 per page on conversation endpoint
- **Search** — prefix-rank scoring in SQL, 20-result limit
- **Graceful shutdown** — 30 s drain for in-flight requests
- **HTTP/2 + gzip** — enabled by default
- **Mail / Redis health** — disabled in actuator to avoid slow probes on free-tier SMTP

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for the full text.

Copyright © 2026 [Mohith32](https://github.com/Mohith32). You are free to use, modify, distribute, and sublicense this software, provided the copyright notice and permission notice are kept intact.

---

## Acknowledgments

- **[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** skill — used during UI pass to reason about palette + style decisions
- Free tier platforms: **Render**, **Supabase**, **Upstash**, **Brevo**, **Expo**
