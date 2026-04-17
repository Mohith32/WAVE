import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { addMessageHandler } from '../utils/websocket';

export function useFriends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [fRes, reqRes] = await Promise.all([
        api.getFriends(),
        api.getPendingRequests()
      ]);
      if (fRes.success && reqRes.success) {
        setFriends(fRes.data || []);
        setRequests(reqRes.data || []);
      } else {
        setError('Failed to load friends');
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
        setFriends(prev => prev.map(u => u.userId === msg.userId ? { ...u, online: msg.online } : u));
      }
    });
    return () => remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await api.searchUsers(query);
    if (res.success) setSearchResults(res.data);
  }, []);

  return { friends, requests, searchResults, loading, refreshing, error, load, search, setFriends, setRequests };
}
