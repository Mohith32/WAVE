import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { storage } from '../utils/storage';
import { addMessageHandler } from '../utils/websocket';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const currentUserIdRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const session = await storage.getSession();
      currentUserIdRef.current = session?.userId;
      const res = await api.getUsers();
      if (res.success) {
        setUsers((res.data || []).filter(u => u.userId !== session?.userId));
      } else {
        setError(res.message || 'Failed to load users');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const remove = addMessageHandler((msg) => {
      if (msg.type === 'presence') {
        setUsers(prev =>
          prev.map(u => u.userId === msg.userId ? { ...u, online: msg.online } : u)
        );
      }
    });
    return () => remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  const updatePresence = useCallback((userId, online) => {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, online } : u));
  }, []);

  return { users, loading, refreshing, error, refresh, updatePresence, currentUserId: currentUserIdRef.current };
}
