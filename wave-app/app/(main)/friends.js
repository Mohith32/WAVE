import React, { memo, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../utils/theme';
import { api } from '../../utils/api';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { useFriends } from '../../hooks/useFriends';

const ResultItem = memo(({ item, onAction, theme, s }) => {
  const isFriend = item.relationship === 'FRIEND';
  const isOutgoing = item.relationship === 'PENDING_OUT';
  const isIncoming = item.relationship === 'PENDING_IN';
  const disabled = isFriend || isOutgoing || isIncoming;

  let label = 'Add';
  let variant = null;
  if (isFriend) { label = 'Friends'; variant = s.actionBtnFriend; }
  else if (isOutgoing) { label = 'Requested'; variant = s.actionBtnDisabled; }
  else if (isIncoming) { label = 'Accept'; variant = s.actionBtnAccept; }

  return (
    <View style={s.item}>
      <Avatar name={item.displayName} size={48} />
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
        {!!item.username && <Text style={s.username}>@{item.username}</Text>}
      </View>
      <TouchableOpacity
        style={[s.actionBtn, variant]}
        disabled={disabled && !isIncoming}
        onPress={() => onAction(item)}
      >
        <Text style={[s.actionText, (isFriend || isOutgoing) && s.actionTextMuted]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
});

const RequestItem = memo(({ item, onAccept, onReject, theme, s }) => (
  <View style={s.item}>
    <Avatar name={item.displayName} size={48} />
    <View style={s.info}>
      <Text style={s.name} numberOfLines={1}>{item.displayName}</Text>
      <Text style={s.username}>Wants to add you</Text>
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

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const { requests, searchResults, refreshing, load, search } = useFriends();

  const handleSearch = async (text) => {
    setQuery(text);
    if (text.length > 2) {
      setSearching(true);
      await search(text);
      setSearching(false);
    }
  };

  const handleResultAction = async (user) => {
    // If incoming request, tapping = accept
    if (user.relationship === 'PENDING_IN') {
      const res = await api.acceptFriendRequest(user.userId);
      if (res.success) {
        Alert.alert('Connected', `You and ${user.displayName} are now friends.`);
        search(query);
        load(true);
      } else {
        Alert.alert('Could not accept', res.message || 'Please try again.');
      }
      return;
    }
    // Otherwise send request
    const res = await api.sendFriendRequest(user.userId);
    if (res.success) {
      Alert.alert('Request sent', `${user.displayName} will see your request.`);
      search(query);
    } else {
      Alert.alert('Could not send request', res.message || 'Please try again.');
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
            placeholder="Search"
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

      <FlatList
        data={query.length > 2 ? searchResults : requests}
        keyExtractor={item => item.userId}
        renderItem={({ item }) =>
          query.length > 2
            ? <ResultItem item={item} onAction={handleResultAction} theme={theme} s={s} />
            : <RequestItem item={item} onAccept={handleAccept} onReject={handleReject} theme={theme} s={s} />
        }
        ItemSeparatorComponent={() => <View style={s.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          query.length > 2 && !searching ? (
            <EmptyState icon="search-outline" title="No results found" />
          ) : !query && requests.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No contacts yet"
              subtitle="Search above by @username or name to find people"
            />
          ) : null
        }
        ListHeaderComponent={
          !query && requests.length > 0 ? (
            <Text style={s.sectionTitle}>FRIEND REQUESTS ({requests.length})</Text>
          ) : query.length > 2 ? (
            <Text style={s.sectionTitle}>SEARCH RESULTS</Text>
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
    fontSize: t.fontSize.xxl,
    color: t.colors.text,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.colors.inputBg,
    borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md,
    color: t.colors.text,
    padding: 0,
  },
  sectionTitle: {
    fontFamily: t.typography.fontMedium,
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    marginTop: 16, marginBottom: 8,
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  info: { flex: 1, marginLeft: 12 },
  name: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
    color: t.colors.text,
  },
  username: {
    fontFamily: t.typography.fontRegular,
    fontSize: 13,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 0.5, marginLeft: 76,
    backgroundColor: t.colors.borderLight,
  },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: t.colors.primary,
    borderRadius: t.borderRadius.full,
    minWidth: 76, alignItems: 'center',
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
