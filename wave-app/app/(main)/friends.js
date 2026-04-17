import React, { memo, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { useFriends } from '../../hooks/useFriends';
import { useTheme } from '../../utils/theme';
import { api } from '../../utils/api';

const MateRow = memo(({ item, onPress, theme, s }) => (
  <Pressable
    onPress={() => onPress(item)}
    style={({ pressed }) => [s.row, pressed && s.rowPressed]}
  >
    <Avatar name={item.displayName} size={44} showOnline online={item.online} />
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
      {!!item.username && <Text style={s.username} numberOfLines={1}>@{item.username}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={16} color={theme.colors.textGhost} />
  </Pressable>
));

const ResultRow = memo(({ item, onAction, onPress, theme, s }) => {
  const isFriend = item.relationship === 'FRIEND';
  const isOut = item.relationship === 'PENDING_OUT';
  const isIn = item.relationship === 'PENDING_IN';

  let label = 'Add';
  let variant = s.actionPrimary;
  let color = '#fff';
  if (isFriend) { label = 'Friends'; variant = s.actionSecondary; color = theme.colors.textMuted; }
  else if (isOut) { label = 'Requested'; variant = s.actionSecondary; color = theme.colors.textMuted; }
  else if (isIn) { label = 'Accept'; variant = s.actionSuccess; color = '#fff'; }

  return (
    <Pressable
      onPress={() => { if (isFriend) onPress(item); }}
      style={({ pressed }) => [s.row, pressed && isFriend && s.rowPressed]}
    >
      <Avatar name={item.displayName} size={44} showOnline online={item.online} />
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        {!!item.username && <Text style={s.username}>@{item.username}</Text>}
      </View>
      <Pressable
        onPress={() => onAction(item)}
        disabled={isOut || isFriend}
        style={({ pressed }) => [s.action, variant, pressed && { opacity: 0.6 }]}
      >
        <Text style={[s.actionText, { color }]}>{label}</Text>
      </Pressable>
    </Pressable>
  );
});

const RequestRow = memo(({ item, onAccept, onReject, theme, s }) => (
  <View style={s.row}>
    <Avatar name={item.displayName} size={44} />
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
      <Text style={s.username}>Wants to be mates</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        onPress={() => onReject(item)}
        style={({ pressed }) => [s.iconReject, pressed && { opacity: 0.5 }]}
      >
        <Ionicons name="close" size={20} color={theme.colors.error} />
      </Pressable>
      <Pressable
        onPress={() => onAccept(item)}
        style={({ pressed }) => [s.iconAccept, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="checkmark" size={20} color="#fff" />
      </Pressable>
    </View>
  </View>
));

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const { friends, requests, searchResults, refreshing, load, search } = useFriends();
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearching(false); search(''); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      await search(text);
      setSearching(false);
    }, 250);
  };

  const openChat = (user) => {
    router.push(`/(main)/chat/${user.userId}?name=${encodeURIComponent(user.displayName)}`);
  };

  const handleResultAction = async (user) => {
    if (user.relationship === 'PENDING_IN') {
      const res = await api.acceptFriendRequest(user.userId);
      if (res.success) { Alert.alert('Mates', `You and ${user.displayName} are now mates.`); search(query); load(true); }
      else Alert.alert('Could not accept', res.message || 'Try again.');
      return;
    }
    const res = await api.sendFriendRequest(user.userId);
    if (res.success) { Alert.alert('Request sent', `${user.displayName} will see it.`); search(query); }
    else Alert.alert('Could not send', res.message || 'Try again.');
  };

  const handleAccept = async (req) => {
    const res = await api.acceptFriendRequest(req.userId);
    if (res.success) load(true);
  };
  const handleReject = async (req) => {
    const res = await api.rejectFriendRequest(req.userId);
    if (res.success) load(true);
  };

  const isSearching = query.trim().length > 0;

  const listData = useMemo(() => {
    if (isSearching) {
      return (searchResults || []).map(u => ({ type: 'result', data: u, key: `r-${u.userId}` }));
    }
    const rows = [];
    if (requests?.length) {
      rows.push({ type: 'heading', label: `Requests`, count: requests.length, key: 'h-req' });
      requests.forEach(r => rows.push({ type: 'request', data: r, key: `req-${r.userId}` }));
    }
    if (friends?.length) {
      rows.push({ type: 'heading', label: `Mates`, count: friends.length, key: 'h-mates' });
      friends.forEach(f => rows.push({ type: 'mate', data: f, key: `mate-${f.userId}` }));
    }
    return rows;
  }, [isSearching, searchResults, requests, friends]);

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'heading':
        return (
          <View style={s.headingRow}>
            <Text style={s.heading}>{item.label}</Text>
            {item.count != null && <Text style={s.headingCount}>{item.count}</Text>}
          </View>
        );
      case 'request':
        return <RequestRow item={item.data} onAccept={handleAccept} onReject={handleReject} theme={theme} s={s} />;
      case 'mate':
        return <MateRow item={item.data} onPress={openChat} theme={theme} s={s} />;
      case 'result':
        return <ResultRow item={item.data} onAction={handleResultAction} onPress={openChat} theme={theme} s={s} />;
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Text style={s.title}>Contacts</Text>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or @username"
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ItemSeparatorComponent={({ leadingItem }) =>
          leadingItem?.type === 'heading' ? null : <View style={s.separator} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          isSearching ? (
            <View style={s.headingRow}>
              <Text style={s.heading}>{searching ? 'Searching…' : 'Results'}</Text>
              {!searching && <Text style={s.headingCount}>{(searchResults || []).length}</Text>}
            </View>
          ) : null
        }
        ListEmptyComponent={
          isSearching && !searching ? (
            <EmptyState icon="search-outline" title={`No results for "${query.trim()}"`} />
          ) : !isSearching && !requests?.length && !friends?.length ? (
            <EmptyState
              icon="people-outline"
              title="No mates yet"
              subtitle="Search above to find people and send a request"
            />
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.surface },
  header: {
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.hairline,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 34, color: t.colors.text,
    letterSpacing: -0.5, marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.colors.inputBg,
    borderRadius: 10, paddingHorizontal: 10, height: 36,
  },
  searchInput: {
    flex: 1,
    fontFamily: t.typography.fontRegular,
    fontSize: 15, color: t.colors.text, padding: 0,
  },

  headingRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8,
    backgroundColor: t.colors.surface,
  },
  heading: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 20, color: t.colors.text,
    letterSpacing: -0.3,
  },
  headingCount: {
    fontFamily: t.typography.fontRegular,
    fontSize: 14, color: t.colors.textMuted,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  rowPressed: { backgroundColor: t.colors.surfaceMuted },
  info: { flex: 1, marginLeft: 12 },
  name: { fontFamily: t.typography.fontSemiBold, fontSize: 17, color: t.colors.text, letterSpacing: -0.2 },
  username: {
    fontFamily: t.typography.fontRegular, fontSize: 14,
    color: t.colors.textMuted, marginTop: 2,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 72, backgroundColor: t.colors.hairline },

  action: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80, alignItems: 'center',
  },
  actionPrimary:   { backgroundColor: t.colors.primary },
  actionSecondary: { backgroundColor: t.colors.surfaceMuted },
  actionSuccess:   { backgroundColor: t.colors.success },
  actionText: { fontFamily: t.typography.fontSemiBold, fontSize: 14 },

  iconReject: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: t.colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },
  iconAccept: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
