import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await api.getMyGroups();
      if (res.success) {
        setGroups(res.data || []);
      } else {
        setError(res.message || 'Failed to load groups');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const refresh = useCallback(() => load(true), [load]);

  const addGroup = useCallback((group) => {
    setGroups(prev => [group, ...prev]);
  }, []);

  return { groups, loading, refreshing, error, load, refresh, addGroup };
}
