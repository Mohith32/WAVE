# WAVE Chat Application

WAVE is a modern, real-time end-to-end encrypted (E2EE) messaging application built with a focus on absolute privacy, instantaneous communication, and a sleek, premium user interface.

## 🏗️ Architecture & Division of Work

*   **Backend:** Built entirely from scratch using **Java Spring Boot**. Everything from the WebSocket orchestration and JPA data persistence to secure REST controllers was intricately programmed by hand.
*   **Frontend:** The React Native mobile frontend was developed with the assistance of **AI tools** to rapidly prototype and implement a beautiful, highly customized "Luminous Fluidity" design aesthetic.

---

## 🚀 Technology Stack

### Backend
- **Framework:** Java 17+, Spring Boot 3.x
- **Database:** PostgreSQL with Flyway for schema migrations.
- **Real-Time Engine:** Spring WebSockets with STOMP/SockJS considerations.
- **Security:** Spring Security, JWT validation, CSRF protection, BCrypt Password Hashing.
- **Storage:** Local File Storage system for images and media.

### Frontend
- **Framework:** React Native, Expo (SDK 50+)
- **Navigation:** Expo Router for file-based navigation.
- **UI Components:** React Native Gifted Chat, Expo Blur for complex glassmorphic components.
- **Design System:** "Architectural Void" – characterized by pure black backgrounds (`#000000`), frosted glass components (`BlurView`), Pearl Blue accents, wide-tracking typography (Inter fonts), and 0.5px specular highlights ("Ghost Borders").
- **Cryptography:** Local crypto implementations for asymmetric and symmetric payload encryption.

---

## 🔐 Security & Cryptography (E2EE)

WAVE ensures that messages cannot be read by anyone other than the sender and the intended recipient.
- **Asymmetric Encryption:** Each device generates a Public/Private Key pair. The public key is registered with the backend.
- **Symmetric Message Encryption (AES):** Every new message generates a unique AES key and IV (Initialization Vector). The AES key itself is then sealed using the recipient's public key.
- **Zero-Knowledge Backend:** The Java Spring Boot server never sees plaintext messages. It solely routes encrypted payload strings alongside the sealed AES keys.

---

## ✨ Features

- **End-to-End Encrypted Direct Messaging:** 1-on-1 private channels.
- **Multi-Node Group Channels:** Broadcast encrypted payloads to multiple users natively.
- **Real-Time Presence:** Online/Offline indicators orchestrated via WebSockets.
- **Typing Indicators & Read Receipts:** Immediate visual feedback during active conversations.
- **Encrypted Media Sharing:** Send images securely; file metadata is padded and encrypted.
- **Ghost Border Aesthetics:** An immersive dark-mode UI with no hard lines, utilizing shadows, blurs, and translucent containers.

---

## 🛠️ Setup Instructions

### 1. Database Configuration
Ensure **PostgreSQL** is running. Create a database called `wave_db`.
Update your `application.properties` or `application.yml` with your database credentials:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/wave_db
spring.datasource.username=postgres
spring.datasource.password=your_password
```

### 2. Backend Orchestration
Navigate to the root directory where the `pom.xml` configuration resides. Compile and run the Spring Boot application using the Maven wrapper:
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Mac/Linux
./mvnw spring-boot:run
```
*The server will start locally on port `8080`. Flyway will automatically run baseline migrations.*

### 3. Frontend Initialization
Navigate to the `wave-app` directory constraints:
```bash
cd wave-app
npm install
```

Since the app connects to your local machine, **you must update the IP Configuration**. 
Open `wave-app/utils/api.js` and change `API_BASE` to match your desktop's local IPv4 address (found via `ipconfig` or `ifconfig`):
```javascript
const API_BASE = 'http://192.168.1.X:8080'; 
```

Boot the interface:
```bash
npx expo start
```
Scan the generated QR code using the **Expo Go** app on your physical mobile device.

---

## 📡 Core API Structure

**REST Endpoints:**
- `POST /api/auth/register` - Registers a node and securely uploads the Public Key.
- `POST /api/auth/login` - Authenticates physical users and returns a JWT.
- `GET /api/users` - Retrieves available nodes for connection.
- `POST /api/files/upload` - Handles encrypted media block uploads.

**WebSocket Events:**
- `message` - Incoming E2EE text payload.
- `group_message` - Incoming broadcast payload.
- `typing` - Remote user interaction state.
- `presence` - Global network online/offline state change.
