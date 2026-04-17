import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { useConversations } from '../../hooks/useConversations';
import { useTheme } from '../../utils/theme';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const hh = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${m} ${ampm}`;
  }
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const previewText = (item) => {
  const who = item.iSentLast ? 'You: ' : '';
  const type = item.lastMessageType || 'TEXT';
  if (type === 'IMAGE') return `${who}Photo`;
  if (type === 'FILE') return `${who}File`;
  return `${who}New message`;
};

const Row = memo(({ item, onPress, theme, s }) => (
  <Pressable
    onPress={() => onPress(item)}
    style={({ pressed }) => [s.row, pressed && s.rowPressed]}
  >
    <Avatar name={item.displayName} size={52} showOnline online={item.online} />
    <View style={s.info}>
      <View style={s.topLine}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={s.time}>{formatWhen(item.lastMessageAt)}</Text>
      </View>
      <View style={s.bottomLine}>
        <Text style={s.preview} numberOfLines={2}>{previewText(item)}</Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.textGhost} />
      </View>
    </View>
  </Pressable>
));

export default function DMsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { conversations, loading, refreshing, error, load } = useConversations();

  const openChat = useCallback((item) => {
    router.push(`/(main)/chat/${item.userId}?name=${encodeURIComponent(item.displayName)}`);
  }, [router]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <View style={s.headerRow}>
          <Text style={s.title}>DMs</Text>
          <Pressable
            onPress={() => router.push('/(main)/friends')}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="create-outline" size={26} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <EmptyState icon="cloud-offline-outline" title="Network error" subtitle={error} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Row item={item} onPress={openChat} theme={theme} s={s} />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={conversations.length === 0 ? s.emptyContent : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            !loading && (
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                subtitle="Tap the pencil to start a DM"
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
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: t.colors.surface,
  },
  rowPressed: { backgroundColor: t.colors.surfaceMuted },
  info: { flex: 1, marginLeft: 12 },
  topLine: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 3,
  },
  bottomLine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  name: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 17, color: t.colors.text, flex: 1, marginRight: 8,
    letterSpacing: -0.2,
  },
  time: {
    fontFamily: t.typography.fontRegular,
    fontSize: 13, color: t.colors.textMuted,
  },
  preview: {
    fontFamily: t.typography.fontRegular,
    fontSize: 15, color: t.colors.textMuted, flex: 1, marginRight: 8,
    lineHeight: 20,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
    backgroundColor: t.colors.hairline,
  },
});
