import React, { memo, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFriends } from '../../hooks/useFriends';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { useTheme } from '../../utils/theme';

const ITEM_HEIGHT = 72;

const ChatItem = memo(({ item, onPress, theme, s }) => (
  <TouchableOpacity
    style={s.item}
    activeOpacity={0.6}
    onPress={() => onPress(item)}
  >
    <Avatar name={item.displayName} size={54} showOnline online={item.online} />
    <View style={s.info}>
      <View style={s.topRow}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        <Text style={s.time}>{item.online ? 'online' : ''}</Text>
      </View>
      <Text style={s.sub} numberOfLines={1}>
        Tap to start a secure chat
      </Text>
    </View>
  </TouchableOpacity>
));

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { friends, loading, refreshing, error, load } = useFriends();

  const handlePress = useCallback((user) => {
    router.push(`/(main)/chat/${user.userId}?name=${encodeURIComponent(user.displayName)}`);
  }, [router]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Text style={s.title}>DMs</Text>
        <TouchableOpacity
          style={s.searchBtn}
          onPress={() => router.push('/(main)/friends')}
          hitSlop={10}
        >
          <Ionicons name="search" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {error ? (
        <EmptyState icon="cloud-offline-outline" title="Network error" subtitle={error} />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => <ChatItem item={item} onPress={handlePress} theme={theme} s={s} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={friends.length === 0 ? s.emptyContent : null}
          getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            !loading && (
              <EmptyState
                icon="chatbubbles-outline"
                title="No DMs yet"
                subtitle="Add contacts to start messaging"
              />
            )
          }
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/(main)/friends')}
        activeOpacity={0.85}
      >
        <Ionicons name="create-outline" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.xxl,
    color: t.colors.text,
  },
  searchBtn: { padding: 6 },
  emptyContent: { flex: 1 },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  info: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
    color: t.colors.text, flex: 1, marginRight: 8,
  },
  time: {
    fontFamily: t.typography.fontRegular,
    fontSize: 12,
    color: t.colors.online,
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
