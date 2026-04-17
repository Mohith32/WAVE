import React, { memo, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../utils/theme';
import { api } from '../../utils/api';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { useFriends } from '../../hooks/useFriends';

// Friend in the list — tap to open a DM
const MateItem = memo(({ item, onPress, theme, s }) => (
  <TouchableOpacity style={s.item} onPress={() => onPress(item)} activeOpacity={0.6}>
    <Avatar name={item.displayName} size={48} showOnline online={item.online} />
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
      {!!item.username && <Text style={s.username}>@{item.username}</Text>}
    </View>
    <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
  </TouchableOpacity>
));

// Search result — Add / Requested / Accept / Friends button
const ResultItem = memo(({ item, onAction, onPress, theme, s }) => {
  const isFriend = item.relationship === 'FRIEND';
  const isOutgoing = item.relationship === 'PENDING_OUT';
  const isIncoming = item.relationship === 'PENDING_IN';

  let label = 'Add';
  let variant = null;
  if (isFriend) { label = 'Friends'; variant = s.actionBtnFriend; }
  else if (isOutgoing) { label = 'Requested'; variant = s.actionBtnDisabled; }
  else if (isIncoming) { label = 'Accept'; variant = s.actionBtnAccept; }

  return (
    <TouchableOpacity
      style={s.item}
      activeOpacity={isFriend ? 0.6 : 1}
      onPress={() => { if (isFriend) onPress(item); }}
    >
      <Avatar name={item.displayName} size={48} showOnline online={item.online} />
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        {!!item.username && <Text style={s.username}>@{item.username}</Text>}
      </View>
      <TouchableOpacity
        style={[s.actionBtn, variant]}
        disabled={isOutgoing || isFriend}
        onPress={() => onAction(item)}
      >
        <Text style={[s.actionText, (isFriend || isOutgoing) && s.actionTextMuted]}>{label}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// Incoming friend request card
const RequestItem = memo(({ item, onAccept, onReject, theme, s }) => (
  <View style={s.item}>
    <Avatar name={item.displayName} size={48} />
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
      <Text style={s.username}>Wants to be mates</Text>
    </View>
    <View style={s.reqActions}>
      <TouchableOpacity style={s.iconBtnReject} onPress={() => onReject(item)}>
        <Ionicons name="close" size={20} color={theme.colors.error} />
      </TouchableOpacity>
      <TouchableOpacity style={s.iconBtnAccept} onPress={() => onAccept(item)}>
        <Ionicons name="checkmark" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const { friends, requests, searchResults, refreshing, load, search } = useFriends();
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setSearching(false);
      search('');
      return;
    }
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
      if (res.success) {
        Alert.alert('Mates', `You and ${user.displayName} are now mates.`);
        search(query);
        load(true);
      } else {
        Alert.alert('Could not accept', res.message || 'Please try again.');
      }
      return;
    }
    const res = await api.sendFriendRequest(user.userId);
    if (res.success) {
      Alert.alert('Request sent', `${user.displayName} will see your request.`);
      search(query);
    } else {
      Alert.alert('Could not send', res.message || 'Please try again.');
    }
  };

  const handleAccept = async (req) => {
    const res = await api.acceptFriendRequest(req.userId);
    if (res.success) load(true);
    else Alert.alert('Error', res.message || 'Could not accept');
  };

  const handleReject = async (req) => {
    const res = await api.rejectFriendRequest(req.userId);
    if (res.success) load(true);
    else Alert.alert('Error', res.message || 'Could not reject');
  };

  const searching_mode = query.trim().length > 0;

  // Compose the main list (non-search). Sections: Requests → Mates.
  // FlatList with typed items so one list can render different row components.
  const listData = useMemo(() => {
    if (searching_mode) {
      return (searchResults || []).map(u => ({ type: 'result', data: u, key: `r-${u.userId}` }));
    }
    const rows = [];
    if (requests?.length) {
      rows.push({ type: 'heading', label: `FRIEND REQUESTS (${requests.length})`, key: 'h-req' });
      requests.forEach(r => rows.push({ type: 'request', data: r, key: `req-${r.userId}` }));
    }
    if (friends?.length) {
      rows.push({ type: 'heading', label: `YOUR MATES (${friends.length})`, key: 'h-mates' });
      friends.forEach(f => rows.push({ type: 'mate', data: f, key: `mate-${f.userId}` }));
    }
    return rows;
  }, [searching_mode, searchResults, requests, friends]);

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'heading':
        return <Text style={s.sectionTitle}>{item.label}</Text>;
      case 'request':
        return <RequestItem item={item.data} onAccept={handleAccept} onReject={handleReject} theme={theme} s={s} />;
      case 'mate':
        return <MateItem item={item.data} onPress={openChat} theme={theme} s={s} />;
      case 'result':
        return <ResultItem item={item.data} onAction={handleResultAction} onPress={openChat} theme={theme} s={s} />;
      default:
        return null;
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
          <Ionicons name="search" size={18} color={theme.colors.textMuted} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or @username"
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searching_mode && (
        <Text style={s.sectionTitle}>
          {searching ? 'SEARCHING…' : `RESULTS (${(searchResults || []).length})`}
        </Text>
      )}

      <FlatList
        data={listData}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ItemSeparatorComponent={({ leadingItem }) =>
          leadingItem?.type === 'heading' ? null : <View style={s.separator} />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          searching_mode && !searching ? (
            <EmptyState icon="search-outline" title={`No results for "${query.trim()}"`} />
          ) : !searching_mode && !requests?.length && !friends?.length ? (
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
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  title: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.xxl, color: t.colors.text, marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.colors.inputBg,
    borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontFamily: t.typography.fontRegular, fontSize: t.fontSize.md,
    color: t.colors.text, padding: 0,
  },
  sectionTitle: {
    fontFamily: t.typography.fontMedium, fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    marginTop: 16, marginBottom: 8, marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.md, color: t.colors.text },
  username: {
    fontFamily: t.typography.fontRegular, fontSize: 13,
    color: t.colors.textMuted, marginTop: 2,
  },
  separator: { height: 0.5, marginLeft: 76, backgroundColor: t.colors.borderLight },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: t.colors.primary,
    borderRadius: t.borderRadius.full,
    minWidth: 82, alignItems: 'center',
  },
  actionBtnFriend: { backgroundColor: t.colors.surfaceMuted },
  actionBtnDisabled: { backgroundColor: t.colors.surfaceMuted },
  actionBtnAccept: { backgroundColor: t.colors.success },
  actionText: { fontFamily: t.typography.fontSemiBold, fontSize: 13, color: '#fff' },
  actionTextMuted: { color: t.colors.textMuted },
  reqActions: { flexDirection: 'row', gap: 8 },
  iconBtnReject: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: t.colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnAccept: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
