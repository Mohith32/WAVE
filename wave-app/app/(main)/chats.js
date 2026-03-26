import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { addMessageHandler } from '../../utils/websocket';
import { theme } from '../../utils/theme';

export default function ChatsScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      const session = await storage.getSession();
      setCurrentUserId(session?.userId);

      const res = await api.getUsers();
      if (res.success) {
        // Filter out self
        const others = (res.data || []).filter(u => u.userId !== session?.userId);
        setUsers(others);
      }
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    // Listen for presence updates
    const removeHandler = addMessageHandler((msg) => {
      if (msg.type === 'presence') {
        setUsers(prev => prev.map(u => 
          u.userId === msg.userId ? { ...u, online: msg.online } : u
        ));
      }
    });

    return () => removeHandler();
  }, [loadUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const renderItem = ({ item }) => {
    // Treat online users as "active" for visual demo (surface-bright background + pill)
    const isActive = item.online;

    return (
      <TouchableOpacity
        style={[s.chatItem, isActive && s.chatItemActive]}
        activeOpacity={0.7}
        onPress={() => router.push(`/(main)/chat/${item.userId}?name=${encodeURIComponent(item.displayName)}`)}
      >
        {isActive && <View style={s.activePill} />}
        
        <View style={s.avatarGroup}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.chatInfo}>
          <Text style={s.userName}>{item.displayName}</Text>
          <Text style={s.lastMessage}>Tap to establish connection</Text>
        </View>

        <View style={s.chatMeta}>
          <Text style={s.metaText}>SECURE</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>MESSAGES</Text>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="search" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.e2eeBar}>
        <Ionicons name="shield-checkmark" size={12} color={theme.colors.secondary} />
        <Text style={s.e2eeText}>ENCRYPTED CONNECTION ESTABLISHED</Text>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.secondary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="hardware-chip-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={s.emptyText}>NO NODES FOUND IN NETWORK.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  title: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.xxl, 
    color: theme.colors.primary, 
    letterSpacing: 4 
  },
  headerBtn: { 
    padding: 10, 
    backgroundColor: theme.colors.surfaceBase, 
    borderRadius: theme.borderRadius.full 
  },
  e2eeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingBottom: 16,
  },
  e2eeText: { 
    color: theme.colors.secondary, 
    fontSize: 10, 
    fontFamily: theme.typography.fontSemiBold, 
    letterSpacing: 1 
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 }, // Leave room for absolute tab bar
  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 16, // The Breathable List token
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'transparent',
  },
  chatItemActive: {
    backgroundColor: theme.colors.surfaceLow,
  },
  activePill: {
    position: 'absolute',
    left: 4,
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: theme.colors.secondary,
  },
  avatarGroup: { marginRight: 16 },
  avatar: {
    width: 56, height: 56, borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: theme.colors.primary, fontSize: 18, fontFamily: theme.typography.fontSemiBold },
  chatInfo: { flex: 1, justifyContent: 'center' },
  userName: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.lg, 
    color: theme.colors.primary, 
    letterSpacing: 0.5, 
    marginBottom: 4 
  },
  lastMessage: { 
    fontFamily: theme.typography.fontLight, 
    fontSize: theme.fontSize.sm, 
    color: theme.colors.textVariant 
  },
  chatMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  metaText: {
    fontFamily: theme.typography.fontSemiBold,
    fontSize: 10,
    color: theme.colors.outlineVariant,
    letterSpacing: 1,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { 
    color: theme.colors.textDisabled, 
    fontSize: theme.fontSize.xs, 
    fontFamily: theme.typography.fontSemiBold, 
    marginTop: 16, 
    letterSpacing: 1 
  },
});
