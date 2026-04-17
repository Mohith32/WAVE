const API_BASE = 'https://wave-1a21.onrender.com';
// Local dev fallbacks:
// const API_BASE = 'http://192.168.1.15:8080';  // LAN (physical device)
// const API_BASE = 'http://10.0.2.2:8080';      // Android emulator
// const API_BASE = 'http://localhost:8080';     // iOS simulator

// https -> wss, http -> ws
export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/chat';

let authToken = null;

export const setAuthToken = (token) => { authToken = token; };
export const getAuthToken = () => authToken;

// 75s to tolerate Render free-tier cold starts (~30-60s). After the first
// request wakes the server, subsequent ones resolve in <1s.
const REQUEST_TIMEOUT = 75000;

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

async function request(url, options = {}, retries = 2) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    
    // If Spring Boot returns 401 Unauthorized for an old token, it might not be JSON
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401) return { success: false, message: 'Unauthorized (Please Log Out)' };
      if (res.status >= 500 && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return request(url, options, retries - 1);
      }
    }
    
    // Attempt to parse JSON safely if there's text
    try {
      return text ? JSON.parse(text) : { success: true };
    } catch {
      return { success: false, message: 'Invalid server response' };
    }
  } catch (e) {
    clearTimeout(timer);
    // On timeout or transient network error, retry once before giving up
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 800));
      return request(url, options, retries - 1);
    }
    if (e.name === 'AbortError') return { success: false, message: 'Request timed out' };
    return { success: false, message: 'Network error' };
  }
}

export const api = {
  register: (body) => request(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  login: (body) => request(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  requestOtp: (email) => request(`${API_BASE}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }),

  verifyOtp: (email, code) => request(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  }),

  getUsers: () => request(`${API_BASE}/api/auth/users`, { headers: jsonHeaders() }),

  getUser: (userId) => request(`${API_BASE}/api/auth/user/${userId}`, { headers: jsonHeaders() }),

  updatePublicKey: (token, publicKey) => request(`${API_BASE}/api/auth/public-key`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ publicKey }),
  }),

  getConversation: (userId1, userId2) => request(
    `${API_BASE}/api/messages/conversation?userId1=${userId1}&userId2=${userId2}`,
    { headers: jsonHeaders() }
  ),

  getConversationPaged: (userId1, userId2, page = 0, size = 30) => request(
    `${API_BASE}/api/messages/conversation/paged?userId1=${userId1}&userId2=${userId2}&page=${page}&size=${size}`,
    { headers: jsonHeaders() }
  ),

  getGroupMessages: (groupId) => request(
    `${API_BASE}/api/messages/group/${groupId}`,
    { headers: jsonHeaders() }
  ),

  getConversations: () => request(
    `${API_BASE}/api/messages/conversations`,
    { headers: jsonHeaders() }
  ),

  createGroup: (groupName, description, memberIds) => request(`${API_BASE}/api/groups/create`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ groupName, description, memberIds }),
  }),

  getMyGroups: () => request(`${API_BASE}/api/groups/my-groups`, { headers: jsonHeaders() }),

  getGroupMembers: (groupId) => request(
    `${API_BASE}/api/groups/${groupId}/members`,
    { headers: jsonHeaders() }
  ),

  uploadFile: async (uri, fileName, mimeType) => {
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: mimeType });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.json();
    } catch (e) {
      clearTimeout(timer);
      return { success: false, message: 'Upload failed' };
    }
  },

  getFileUrl: (fileName) => `${API_BASE}/api/files/${fileName}`,

  // Friends & Search
  searchUsers: (query) => request(`${API_BASE}/api/auth/search?q=${encodeURIComponent(query)}`, { headers: jsonHeaders() }),
  getFriends: () => request(`${API_BASE}/api/friends`, { headers: jsonHeaders() }),
  getPendingRequests: () => request(`${API_BASE}/api/friends/pending`, { headers: jsonHeaders() }),
  getFriendStatus: (userId) => request(`${API_BASE}/api/friends/status/${userId}`, { headers: jsonHeaders() }),
  sendFriendRequest: (userId) => request(`${API_BASE}/api/friends/request/${userId}`, { method: 'POST', headers: jsonHeaders() }),
  acceptFriendRequest: (userId) => request(`${API_BASE}/api/friends/accept/${userId}`, { method: 'PUT', headers: jsonHeaders() }),
  rejectFriendRequest: (userId) => request(`${API_BASE}/api/friends/reject/${userId}`, { method: 'PUT', headers: jsonHeaders() }),
  unfriend: (userId) => request(`${API_BASE}/api/friends/unfriend/${userId}`, { method: 'DELETE', headers: jsonHeaders() }),
};
