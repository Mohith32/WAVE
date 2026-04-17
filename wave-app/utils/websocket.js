import { WS_URL, getAuthToken } from './api';

let ws = null;
let messageHandlers = [];
let reconnectTimer = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
const messageQueue = [];

const MAX_RECONNECT_DELAY = 30000;
const BASE_DELAY = 1000;

const getReconnectDelay = () =>
  Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);

const flushQueue = () => {
  while (messageQueue.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
    const msg = messageQueue.shift();
    ws.send(JSON.stringify(msg));
  }
};

export const connectWebSocket = (token) => {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  manualDisconnect = false;

  const url = `${WS_URL}?token=${token || getAuthToken()}`;
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    flushQueue();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      messageHandlers.forEach((h) => h(data));
    } catch (e) {}
  };

  ws.onclose = (event) => {
    ws = null;
    if (manualDisconnect) return;
    const delay = getReconnectDelay();
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
      const t = getAuthToken();
      if (t) connectWebSocket(t);
    }, delay);
  };

  ws.onerror = () => {};
};

export const disconnectWebSocket = () => {
  manualDisconnect = true;
  reconnectAttempts = 0;
  messageQueue.length = 0;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { ws.close(); ws = null; }
};

export const addMessageHandler = (handler) => {
  messageHandlers.push(handler);
  return () => { messageHandlers = messageHandlers.filter((h) => h !== handler); };
};

export const sendWsMessage = (data) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  } else {
    messageQueue.push(data);
  }
};

export const sendChatMessage = (receiverId, encryptedContent, encryptedAesKey, senderEncryptedAesKey, iv, messageType = 'TEXT', fileInfo = null) => {
  const msg = { type: 'message', receiverId, encryptedContent, encryptedAesKey, senderEncryptedAesKey, iv, messageType };
  if (fileInfo) { msg.fileName = fileInfo.fileName; msg.fileUrl = fileInfo.fileUrl; msg.fileSize = fileInfo.fileSize; }
  sendWsMessage(msg);
};

export const sendGroupMessage = (groupId, encryptedContent, encryptedAesKey, senderEncryptedAesKey, iv, messageType = 'TEXT', fileInfo = null) => {
  const msg = { type: 'group_message', groupId, encryptedContent, encryptedAesKey, senderEncryptedAesKey, iv, messageType };
  if (fileInfo) { msg.fileName = fileInfo.fileName; msg.fileUrl = fileInfo.fileUrl; msg.fileSize = fileInfo.fileSize; }
  sendWsMessage(msg);
};

export const sendTyping = (receiverId, groupId = null) =>
  sendWsMessage({ type: 'typing', receiverId: receiverId || '', groupId: groupId || '' });

export const sendReadReceipt = (receiverId) =>
  sendWsMessage({ type: 'read_receipt', receiverId });

export const getWsState = () => ws?.readyState ?? -1;
