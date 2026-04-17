import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { addMessageHandler } from '../utils/websocket';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.getConversations();
      if (res.success) {
        setConversations(res.data || []);
      } else {
        setError(res.message || 'Failed to load conversations');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const remove = addMessageHandler((msg) => {
      // Refresh when a new 1:1 message arrives
      if (msg.type === 'message') load();
      // Bubble presence changes to the list
      if (msg.type === 'presence') {
        setConversations(prev =>
          prev.map(c => c.userId === msg.userId ? { ...c, online: !!msg.online } : c)
        );
      }
    });
    return () => remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { conversations, loading, refreshing, error, load };
}
