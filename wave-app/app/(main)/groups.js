import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroups } from '../../hooks/useGroups';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../utils/theme';
import { getAvatarColor } from '../../components/Avatar';

const ITEM_HEIGHT = 72;

const GroupItem = memo(({ item, onPress, theme, s }) => {
  const bg = getAvatarColor(item.groupName);
  return (
    <TouchableOpacity style={s.item} activeOpacity={0.6} onPress={() => onPress(item)}>
      <View style={[s.avatar, { backgroundColor: bg }]}>
        <Ionicons name="people" size={26} color="#fff" />
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.groupName}</Text>
        <Text style={s.sub} numberOfLines={1}>
          {item.description || 'Clan chat'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { groups, loading, refreshing, error, load } = useGroups();

  const handlePress = useCallback((group) => {
    router.push(`/(main)/group-chat/${group.groupId}?name=${encodeURIComponent(group.groupName)}`);
  }, [router]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Text style={s.title}>Clans</Text>
      </View>

      {error ? (
        <EmptyState icon="cloud-offline-outline" title="Network error" subtitle={error} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.groupId}
          renderItem={({ item }) => <GroupItem item={item} onPress={handlePress} theme={theme} s={s} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={groups.length === 0 ? s.emptyContent : null}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          ListEmptyComponent={
            !loading && (
              <EmptyState
                icon="flame-outline"
                title="No clans yet"
                subtitle="Create a clan to chat with your crew"
              />
            )
          }
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/(main)/create-group')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.xxl,
    color: t.colors.text,
  },
  emptyContent: { flex: 1 },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  name: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
    color: t.colors.text, marginBottom: 3,
  },
  sub: {
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
  },
  separator: {
    height: 0.5, marginLeft: 84,
    backgroundColor: t.colors.borderLight,
  },
  fab: {
    position: 'absolute',
    right: 18, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...t.shadow.lg,
  },
});
