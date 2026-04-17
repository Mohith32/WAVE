import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { api } from '../../utils/api';
import { useTheme } from '../../utils/theme';

export default function CreateClanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadUsers(); }, []);
  const loadUsers = async () => {
    try {
      const res = await api.getFriends();
      if (res.success) setUsers(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleUser = (userId) => {
    const next = new Set(selected);
    next.has(userId) ? next.delete(userId) : next.add(userId);
    setSelected(next);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const res = await api.createGroup(groupName.trim(), description.trim(), Array.from(selected));
      if (res.success) {
        router.replace(`/(main)/group-chat/${res.data.groupId}?name=${encodeURIComponent(res.data.groupName)}`);
      } else Alert.alert('Error', res.message || 'Failed to create clan');
    } catch { Alert.alert('Error', 'Connection failed'); }
    finally { setCreating(false); }
  };

  const renderItem = ({ item }) => {
    const isSelected = selected.has(item.userId);
    return (
      <Pressable onPress={() => toggleUser(item.userId)} style={({ pressed }) => [s.row, pressed && s.pressed]}>
        <Avatar name={item.displayName} size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.name}>{item.displayName}</Text>
          {!!item.username && <Text style={s.username}>@{item.username}</Text>}
        </View>
        {isSelected ? (
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
        ) : (
          <View style={s.unchecked} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.title}>New Clan</Text>
        <Pressable
          onPress={handleCreate}
          disabled={!groupName.trim() || creating}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          {creating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[s.done, (!groupName.trim()) && { color: theme.colors.textGhost }]}>Create</Text>
          )}
        </Pressable>
      </View>

      <View style={s.form}>
        <TextInput
          style={s.bigInput}
          placeholder="Clan name"
          placeholderTextColor={theme.colors.placeholder}
          value={groupName} onChangeText={setGroupName}
          maxLength={40}
        />
        <View style={s.divider} />
        <TextInput
          style={s.smallInput}
          placeholder="Description (optional)"
          placeholderTextColor={theme.colors.placeholder}
          value={description} onChangeText={setDescription}
          maxLength={80}
        />
      </View>

      <Text style={s.sectionLabel}>ADD MATES {selected.size > 0 ? `· ${selected.size}` : ''}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No mates yet"
          subtitle="Add friends from Contacts first"
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          style={s.list}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={{ backgroundColor: theme.colors.surface }}
        />
      )}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.hairline,
  },
  title: { fontFamily: t.typography.fontSemiBold, fontSize: 17, color: t.colors.text },
  cancel: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.primary },
  done: { fontFamily: t.typography.fontSemiBold, fontSize: 17, color: t.colors.primary },

  form: {
    backgroundColor: t.colors.surface,
    marginTop: 16, marginHorizontal: 16, borderRadius: 12,
    overflow: 'hidden',
  },
  bigInput: {
    color: t.colors.text, fontFamily: t.typography.fontRegular,
    fontSize: 17, paddingHorizontal: 14, paddingVertical: 12,
  },
  smallInput: {
    color: t.colors.text, fontFamily: t.typography.fontRegular,
    fontSize: 17, paddingHorizontal: 14, paddingVertical: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 14, backgroundColor: t.colors.hairline },

  sectionLabel: {
    fontFamily: t.typography.fontRegular, fontSize: 13, letterSpacing: 0.3,
    color: t.colors.textMuted, marginTop: 22, marginBottom: 6, marginLeft: 28,
    textTransform: 'uppercase',
  },

  list: {
    backgroundColor: t.colors.surface,
    marginHorizontal: 16, borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: t.colors.surface,
  },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  name: { fontFamily: t.typography.fontRegular, fontSize: 17, color: t.colors.text },
  username: { fontFamily: t.typography.fontRegular, fontSize: 13, color: t.colors.textMuted, marginTop: 2 },
  unchecked: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: t.colors.border,
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 66, backgroundColor: t.colors.hairline },
});
