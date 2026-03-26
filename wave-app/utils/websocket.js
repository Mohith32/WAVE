import { WS_URL, getAuthToken } from './api';

let ws = null;
let messageHandlers = [];
let reconnectTimer = null;

export const connectWebSocket = (token) => {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const url = `${WS_URL}?token=${token || getAuthToken()}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[WS] Connected');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      messageHandlers.forEach((handler) => handler(data));
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  ws.onclose = (event) => {
    console.log('[WS] Disconnected:', event.code, event.reason);
    ws = null;
    // Auto-reconnect after 3 seconds
    reconnectTimer = setTimeout(() => {
      const t = getAuthToken();
      if (t) connectWebSocket(t);
    }, 3000);
  };

  ws.onerror = (error) => {
    console.error('[WS] Error:', error.message);
  };
};

export const disconnectWebSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
};

export const addMessageHandler = (handler) => {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== handler);
  };
};

export const sendWsMessage = (data) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
};

export const sendChatMessage = (receiverId, encryptedContent, encryptedAesKey, iv, messageType = 'TEXT', fileInfo = null) => {
  const msg = {
    type: 'message',
    receiverId,
    encryptedContent,
    encryptedAesKey,
    iv,
    messageType,
  };
  if (fileInfo) {
    msg.fileName = fileInfo.fileName;
    msg.fileUrl = fileInfo.fileUrl;
    msg.fileSize = fileInfo.fileSize;
  }
  sendWsMessage(msg);
};

export const sendGroupMessage = (groupId, encryptedContent, encryptedAesKey, iv, messageType = 'TEXT', fileInfo = null) => {
  const msg = {
    type: 'group_message',
    groupId,
    encryptedContent,
    encryptedAesKey,
    iv,
    messageType,
  };
  if (fileInfo) {
    msg.fileName = fileInfo.fileName;
    msg.fileUrl = fileInfo.fileUrl;
    msg.fileSize = fileInfo.fileSize;
  }
  sendWsMessage(msg);
};

export const sendTyping = (receiverId, groupId = null) => {
  sendWsMessage({
    type: 'typing',
    receiverId: receiverId || '',
    groupId: groupId || '',
  });
};

export const sendReadReceipt = (receiverId) => {
  sendWsMessage({
    type: 'read_receipt',
    receiverId,
  });
};
