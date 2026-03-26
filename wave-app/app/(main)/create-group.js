import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../utils/api';
import { theme, ghostBorder } from '../../utils/theme';
import { storage } from '../../utils/storage';

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

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
      Alert.alert('Error', 'Group name is required');
      return;
    }
    
    setCreating(true);
    try {
      const res = await api.createGroup(
        groupName.trim(), 
        description.trim(), 
        Array.from(selectedUsers)
      );
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
      <TouchableOpacity
        style={[s.userItem, isSelected && s.userItemSelected]}
        activeOpacity={0.7}
        onPress={() => toggleUser(item.userId)}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.userName}>{item.displayName}</Text>
        <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={14} color={theme.colors.background} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 40 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={theme.colors.textVariant} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>NEW CHANNEL</Text>
        <TouchableOpacity 
          style={s.headerBtn} 
          onPress={handleCreate}
          disabled={creating || !groupName.trim()}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={[s.headerAction, !groupName.trim() && s.actionDisabled]}>CREATE</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.form}>
        <BlurView intensity={40} tint="dark" style={[s.inputCard, ghostBorder]}>
          <View style={[s.inputWrap, ghostBorder]}>
            <Ionicons name="people-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Channel Name"
              placeholderTextColor={theme.colors.placeholder}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>
          <View style={[s.inputWrap, ghostBorder]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textVariant} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Description (Optional)"
              placeholderTextColor={theme.colors.placeholder}
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </BlurView>
      </View>

      <View style={s.listHeader}>
        <Text style={s.listTitle}>ADD NODES ({selectedUsers.size})</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.secondary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          contentContainerStyle={s.list}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerBtn: { padding: 4, minWidth: 60, alignItems: 'center' },
  headerTitle: { 
    fontSize: theme.fontSize.lg, 
    color: theme.colors.primary, 
    fontFamily: theme.typography.fontSemiBold, 
    letterSpacing: 2 
  },
  headerAction: { 
    color: theme.colors.secondary, 
    fontSize: theme.fontSize.xs, 
    fontFamily: theme.typography.fontSemiBold, 
    letterSpacing: 1 
  },
  actionDisabled: { color: theme.colors.textDisabled },
  
  form: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  inputCard: {
    padding: 20,
    gap: 16,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceBase,
    overflow: 'hidden',
    ...theme.elevation.floating,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.borderRadius.xl, 
    paddingHorizontal: 16, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, color: theme.colors.text, 
    fontSize: theme.fontSize.md, fontFamily: theme.typography.fontRegular, letterSpacing: 0.5 
  },
  
  listHeader: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: 'transparent' },
  listTitle: { 
    color: theme.colors.secondary, 
    fontSize: 10, 
    fontFamily: theme.typography.fontSemiBold, 
    letterSpacing: 2 
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  userItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'transparent',
  },
  userItemSelected: {
    backgroundColor: theme.colors.surfaceLow,
  },
  avatar: {
    width: 44, height: 44, borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceHigh,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { color: theme.colors.primary, fontSize: 16, fontFamily: theme.typography.fontSemiBold },
  userName: { 
    flex: 1, color: theme.colors.text, 
    fontSize: theme.fontSize.md, fontFamily: theme.typography.fontRegular 
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1, borderColor: theme.colors.outlineVariant,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
});
