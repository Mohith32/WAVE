import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { useTheme } from '../../utils/theme';
import Avatar from '../../components/Avatar';

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const session = await storage.getSession();
      const res = await api.getUsers();
      if (res.success) {
        setUsers((res.data || []).filter(u => u.userId !== session?.userId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUsers(next);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }
    setCreating(true);
    try {
      const res = await api.createGroup(groupName.trim(), description.trim(), Array.from(selectedUsers));
      if (res.success) {
        router.replace(`/(main)/group-chat/${res.data.groupId}?name=${encodeURIComponent(res.data.groupName)}`);
      } else {
        Alert.alert('Error', res.message || 'Failed to create group');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedUsers.has(item.userId);
    return (
      <TouchableOpacity style={s.userItem} onPress={() => toggleUser(item.userId)} activeOpacity={0.6}>
        <Avatar name={item.displayName} size={44} />
        <Text style={s.userName}>{item.displayName}</Text>
        <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Group</Text>
        <TouchableOpacity
          style={[s.createBtn, !groupName.trim() && s.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating || !groupName.trim()}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={[s.createBtnText, !groupName.trim() && { color: theme.colors.textMuted }]}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="Group name"
          placeholderTextColor={theme.colors.placeholder}
          value={groupName}
          onChangeText={setGroupName}
        />
        <View style={s.divider} />
        <TextInput
          style={s.input}
          placeholder="Description (optional)"
          placeholderTextColor={theme.colors.placeholder}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>ADD MEMBERS</Text>
        {selectedUsers.size > 0 && <Text style={s.selectedCount}>{selectedUsers.size} selected</Text>}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: t.colors.headerBg,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.lg,
    color: t.colors.text,
  },
  createBtn: { paddingHorizontal: 12, paddingVertical: 6, minWidth: 70, alignItems: 'flex-end' },
  createBtnDisabled: {},
  createBtnText: {
    color: t.colors.primary,
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.md,
  },

  form: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: 16, paddingVertical: 4,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  input: {
    color: t.colors.text,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md,
    paddingVertical: 14,
  },
  divider: { height: 0.5, backgroundColor: t.colors.borderLight },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 8,
  },
  sectionTitle: {
    fontFamily: t.typography.fontMedium,
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    letterSpacing: 0.5,
  },
  selectedCount: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.sm,
    color: t.colors.primary,
  },

  sep: { height: 0.5, marginLeft: 72, backgroundColor: t.colors.borderLight },

  userItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
  },
  userName: {
    flex: 1, marginLeft: 14,
    color: t.colors.text,
    fontSize: t.fontSize.md,
    fontFamily: t.typography.fontRegular,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: t.colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
});
