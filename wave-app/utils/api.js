const API_BASE = 'http://192.168.1.15:8080'; // Physical device / Local Network
// const API_BASE = 'http://10.0.2.2:8080'; // Android emulator localhost
// const API_BASE = 'http://localhost:8080'; // iOS simulator

export const WS_URL = API_BASE.replace('http', 'ws') + '/chat';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const headers = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

export const api = {
  // Auth
  register: async (email, password, displayName, publicKey) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, publicKey }),
    });
    return res.json();
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  getUsers: async () => {
    const res = await fetch(`${API_BASE}/api/auth/users`, { headers: headers() });
    return res.json();
  },

  getUser: async (userId) => {
    const res = await fetch(`${API_BASE}/api/auth/user/${userId}`, { headers: headers() });
    return res.json();
  },

  updatePublicKey: async (publicKey) => {
    const res = await fetch(`${API_BASE}/api/auth/public-key`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ publicKey }),
    });
    return res.json();
  },

  // Messages
  getConversation: async (userId1, userId2) => {
    const res = await fetch(
      `${API_BASE}/api/messages/conversation?userId1=${userId1}&userId2=${userId2}`,
      { headers: headers() }
    );
    return res.json();
  },

  getGroupMessages: async (groupId) => {
    const res = await fetch(`${API_BASE}/api/messages/group/${groupId}`, { headers: headers() });
    return res.json();
  },

  // Groups
  createGroup: async (groupName, description, memberIds) => {
    const res = await fetch(`${API_BASE}/api/groups/create`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ groupName, description, memberIds }),
    });
    return res.json();
  },

  getMyGroups: async () => {
    const res = await fetch(`${API_BASE}/api/groups/my-groups`, { headers: headers() });
    return res.json();
  },

  getGroupMembers: async (groupId) => {
    const res = await fetch(`${API_BASE}/api/groups/${groupId}/members`, { headers: headers() });
    return res.json();
  },

  // Files
  uploadFile: async (uri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: mimeType });
    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData,
    });
    return res.json();
  },

  getFileUrl: (fileName) => `${API_BASE}/api/files/${fileName}`,
};
