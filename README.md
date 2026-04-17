# WAVE Chat Application

![Wave Application](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

WAVE is a modern, real-time end-to-end encrypted (E2EE) messaging application built with a focus on privacy, security, and a clean user experience.

---

## 🏗️ Architecture & Division of Work

- **Backend:** Built entirely from scratch using **Java Spring Boot** — WebSocket orchestration, JPA persistence, secure REST APIs, JWT auth, and file storage, all written by hand.
- **Frontend:** The React Native mobile app was developed with the assistance of **AI tools**, featuring a clean modern light-mode UI with an indigo accent design system.

---

## 🚀 Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Java 17+, Spring Boot 3.x | Core framework |
| PostgreSQL | Relational database |
| Flyway | Automated schema migrations |
| Spring WebSockets | Real-time messaging |
| Spring Security + JWT | Authentication & authorization |
| BCrypt (strength 12) | Password hashing |
| Local File System | Image & media storage |

### Frontend
| Technology | Purpose |
|---|---|
| React Native, Expo SDK 50+ | Cross-platform mobile framework |
| Expo Router | File-based navigation |
| React Native Gifted Chat | Chat UI component |
| Inter (Google Fonts) | Typography |
| Expo Image Picker | Media selection |
| Custom Crypto Utils | Local E2EE key generation |

**Design System:** Clean light-mode UI — soft gray background (`#F5F6FA`), white cards, indigo accent (`#5B6EF5`), colorful initials avatars, and standard rounded card components.

---

## 🔐 Security & Cryptography (E2EE)

WAVE ensures messages cannot be read by anyone except the sender and recipient.

- **Asymmetric Key Pair:** Each device locally generates an RSA Public/Private Key on registration. The public key is stored on the server; the private key never leaves the device.
- **AES Message Encryption:** Every message generates a fresh AES key + IV. The message body is AES-encrypted, and the AES key is sealed with the recipient's RSA public key.
- **Zero-Knowledge Server:** The Spring Boot backend only routes encrypted ciphertext — it has no access to plaintext messages at any point.

---

## ✨ Features

- **1-on-1 E2EE Messaging** — Private, encrypted direct conversations
- **Group Channels** — Multi-member group messaging
- **Real-Time Presence** — Online/offline indicators via WebSockets
- **Typing Indicators** — Live feedback when the other person is typing
- **Read Receipts** — See when your message has been read
- **Image Sharing** — Send images within conversations
- **JWT Authentication** — Stateless, secure session management

---

## 🛠️ Setup Instructions

### 1. Database
Ensure **PostgreSQL** is running and create a database named `wave_db`. Update `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/wave_db
spring.datasource.username=postgres
spring.datasource.password=your_password
```

### 2. Run the Backend
From the project root (where `pom.xml` lives):
```bash
# Windows PowerShell
.\mvnw.cmd spring-boot:run

# Mac / Linux
./mvnw spring-boot:run
```
> The server starts on port `8080`. Flyway runs migrations automatically on startup.

### 3. Run the Frontend
```bash
cd wave-app
npm install
npx expo start
```

Before starting, update `wave-app/utils/api.js` with your machine's local IP address (find it with `ipconfig` on Windows or `ifconfig` on Mac/Linux):
```javascript
const API_BASE = 'http://192.168.X.X:8080';
```

Scan the QR code with the **Expo Go** app on your phone to launch the app.

---

## 📡 API Reference

### REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user, upload public key |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `GET` | `/api/auth/users` | List all registered users |
| `GET` | `/api/auth/user/:id` | Get a single user's public key |
| `PUT` | `/api/auth/public-key` | Update device public key |
| `GET` | `/api/messages/conversation` | Fetch 1-on-1 message history |
| `GET` | `/api/messages/group/:groupId` | Fetch group message history |
| `POST` | `/api/groups/create` | Create a new group |
| `GET` | `/api/groups/my-groups` | List current user's groups |
| `GET` | `/api/groups/:id/members` | Get group member list + public keys |
| `POST` | `/api/files/upload` | Upload an image or file |
| `GET` | `/api/files/:fileName` | Retrieve a stored file |

### WebSocket Events (`/chat`)
| Event | Direction | Description |
|---|---|---|
| `message` | Send / Receive | Encrypted 1-on-1 message |
| `message_sent` | Receive | Delivery confirmation from server |
| `group_message` | Send / Receive | Encrypted group broadcast |
| `typing` | Send / Receive | Typing indicator |
| `read_receipt` | Send / Receive | Message read acknowledgment |
| `presence` | Receive | User online/offline status change |
