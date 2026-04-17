import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import { useGroups } from '../../hooks/useGroups';
import { useTheme } from '../../utils/theme';
import { getAvatarColor } from '../../components/Avatar';

const Row = memo(({ item, onPress, theme, s }) => {
  const bg = getAvatarColor(item.groupName);
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
    >
      <View style={[s.clanAvatar, { backgroundColor: bg }]}>
        <Ionicons name="people" size={22} color="#fff" />
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.groupName}</Text>
        <Text style={s.sub} numberOfLines={1}>{item.description || 'Clan chat'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} />
    </Pressable>
  );
});

export default function ClansScreen() {
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
        <View style={s.headerRow}>
          <Text style={s.title}>Clans</Text>
          <Pressable
            onPress={() => router.push('/(main)/create-group')}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="add" size={30} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <EmptyState icon="cloud-offline-outline" title="Network error" subtitle={error} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
          renderItem={({ item }) => <Row item={item} onPress={handlePress} theme={theme} s={s} />}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={groups.length === 0 ? s.emptyContent : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            !loading && (
              <EmptyState
                icon="people-circle-outline"
                title="No clans yet"
                subtitle="Create a clan to chat with your mates"
              />
            )
          }
        />
      )}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.surface },
  header: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.hairline,
    paddingHorizontal: 20, paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 34, color: t.colors.text,
    letterSpacing: -0.5,
  },
  emptyContent: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  rowPressed: { backgroundColor: t.colors.surfaceMuted },
  clanAvatar: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 12 },
  name: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 17, color: t.colors.text, marginBottom: 2,
    letterSpacing: -0.2,
  },
  sub: {
    fontFamily: t.typography.fontRegular,
    fontSize: 14, color: t.colors.textMuted,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76, backgroundColor: t.colors.hairline },
});
