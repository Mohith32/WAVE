# WAVE Chat Application

WAVE is a modern, real-time end-to-end encrypted messaging application.

### Architecture

*   **Backend:** Built entirely from scratch by Mohith using Java Spring Boot. 
*   **Frontend:** The React Native mobile frontend, incorporating the "Luminous Fluidity" design aesthetic, was developed with the assistance of AI tools.

### Features
- Real-time instant messaging using WebSockets.
- End-to-end encryption to guarantee message privacy.
- Peer-to-peer secure connection aesthetics with "Ghost Border" frosted glass UI.
- Direct messages and multi-node group channels.
- Media sharing support.

### Setup Instructions

1. **Backend**:
    - Ensure Java and Maven are installed.
    - Setup your PostgreSQL database and update credentials in `application.properties`.
    - Run the backend via `./mvnw.cmd spring-boot:run`.
2. **Frontend**:
    - Inside the `wave-app` directory, install dependencies: `npm install`.
    - Update `utils/api.js` with your local IP address.
    - Start Expo: `npx expo start`.
