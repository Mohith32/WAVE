import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { theme } from '../../utils/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const res = await api.getMyGroups();
      if (res.success) {
        setGroups(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load groups', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={s.groupItem}
      activeOpacity={0.7}
      onPress={() => router.push(`/(main)/group-chat/${item.groupId}?name=${encodeURIComponent(item.groupName)}`)}
    >
      <View style={s.avatar}>
        <Ionicons name="people" size={24} color={theme.colors.background} />
      </View>

      <View style={s.groupInfo}>
        <Text style={s.groupName}>{item.groupName}</Text>
        <Text style={s.description} numberOfLines={1}>
          {item.description || "Secure group channel"}
        </Text>
      </View>

      <View style={s.groupMeta}>
        <Text style={s.metaText}>MULTI-NODE</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>CHANNELS</Text>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => router.push('/(main)/create-group')}
        >
          <Ionicons name="add" size={24} color={theme.colors.background} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
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
              <Ionicons name="people-outline" size={48} color={theme.colors.textDisabled} />
              <Text style={s.emptyText}>NO ACTIVE CHANNELS FOUND.</Text>
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
    backgroundColor: theme.colors.primary, 
    borderRadius: theme.borderRadius.full 
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 }, // Under tab bar
  groupItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.xl,
  },
  avatar: {
    width: 56, height: 56, borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  groupInfo: { flex: 1, justifyContent: 'center' },
  groupName: { 
    fontFamily: theme.typography.fontSemiBold, 
    fontSize: theme.fontSize.lg, 
    color: theme.colors.primary, 
    letterSpacing: 0.5, 
    marginBottom: 4 
  },
  description: { 
    fontFamily: theme.typography.fontLight, 
    fontSize: theme.fontSize.sm, 
    color: theme.colors.textVariant 
  },
  groupMeta: { alignItems: 'flex-end', justifyContent: 'center' },
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
