import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendGroupMessage, addMessageHandler } from '../../../utils/websocket';
import { useTheme } from '../../../utils/theme';
import { getAvatarColor } from '../../../components/Avatar';

function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const hh = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m} ${ampm}`;
}

function GroupBubble({ item, isMe, theme, s }) {
  const time = formatTime(new Date(item.createdAt));
  const senderColor = getAvatarColor(item.senderName || item.senderId);

  if (item.image) {
    return (
      <View style={[s.bubbleRow, isMe ? s.rowRight : s.rowLeft]}>
        <View style={[s.imageBubble, isMe ? null : s.recvBorder]}>
          {!isMe && item.senderName && (
            <Text style={[s.senderName, { color: senderColor }]}>{item.senderName}</Text>
          )}
          <Image source={{ uri: item.image }} style={s.image} resizeMode="cover" />
          <View style={s.imageTimeRow}>
            <Text style={[s.time, isMe ? s.timeSent : s.timeRecv]}>{time}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.bubbleRow, isMe ? s.rowRight : s.rowLeft]}>
      <View style={[s.bubble, isMe ? s.sent : s.recv]}>
        {!isMe && item.senderName && (
          <Text style={[s.senderName, { color: senderColor }]}>{item.senderName}</Text>
        )}
        <Text style={[s.text, isMe ? s.textSent : s.textRecv]}>{item.text}</Text>
        <View style={s.timeRow}>
          <Text style={[s.time, isMe ? s.timeSent : s.timeRecv]}>{time}</Text>
        </View>
      </View>
    </View>
  );
}

export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const currentUserId = useRef(null);

  useEffect(() => {
    initChat();
    const remove = addMessageHandler((msg) => {
      if (msg.type === 'group_message' && msg.data.groupId === groupId) {
        const mapped = processGroupMessage(msg.data, currentUserId.current);
        setMessages(prev => [mapped, ...prev]);
      }
    });
    return () => remove();
  }, [groupId]);

  const initChat = async () => {
    const session = await storage.getSession();
    currentUserId.current = session?.userId;
    try {
      const histRes = await api.getGroupMessages(groupId);
      if (histRes.success) {
        const mapped = (histRes.data || []).map(m => processGroupMessage(m, session.userId));
        setMessages(mapped);
      }
    } catch (e) {
      console.error('Failed to load group chat', e);
    }
  };

  const processGroupMessage = (m, myUserId) => ({
    _id: m.messageId,
    senderId: m.senderId,
    senderName: m.senderId === myUserId ? 'Me' : 'Member',
    text: m.encryptedContent || '',
    image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
    createdAt: m.timestamp,
  });

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const pending = {
      _id: `pending-${Date.now()}`,
      senderId: currentUserId.current,
      senderName: 'Me',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [pending, ...prev]);
    sendGroupMessage(groupId, text, 'none', 'none', 'none', 'TEXT');
  }, [input, groupId]);

  const renderItem = useCallback(({ item }) => (
    <GroupBubble item={item} isMe={item.senderId === currentUserId.current} theme={theme} s={s} />
  ), [theme, s]);

  const bg = getAvatarColor(groupName);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={[s.groupAvatar, { backgroundColor: bg }]}>
          <Ionicons name="people" size={22} color="#fff" />
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{groupName}</Text>
          <Text style={s.headerStatus}>clan</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 50) : 0}
      >
        <FlatList
          style={s.list}
          inverted
          data={messages}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={s.textInput}
            placeholder="Message"
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.chatBg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.colors.headerBg,
    paddingBottom: 10, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  backBtn: { padding: 6, marginRight: 2 },
  groupAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontFamily: t.typography.fontSemiBold, fontSize: t.fontSize.lg, color: t.colors.text },
  headerStatus: { fontSize: 12, fontFamily: t.typography.fontRegular, color: t.colors.textSecondary, marginTop: 1 },
  headerBtn: { padding: 8 },

  list: { flex: 1, backgroundColor: t.colors.chatBg },
  listContent: { paddingVertical: 8, paddingHorizontal: 8 },

  bubbleRow: { flexDirection: 'row', marginVertical: 2 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  bubble: {
    maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 14,
  },
  sent: {
    backgroundColor: t.colors.bubbleSent,
    borderBottomRightRadius: 4,
  },
  recv: {
    backgroundColor: t.colors.bubbleReceived,
    borderBottomLeftRadius: 4,
    borderWidth: t.isDark ? 0 : 0.5,
    borderColor: t.colors.bubbleBorder,
  },
  recvBorder: { borderBottomLeftRadius: 4 },

  imageBubble: {
    maxWidth: '78%', borderRadius: 14, overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
  },
  image: { width: 240, height: 240 },
  imageTimeRow: {
    position: 'absolute', bottom: 6, right: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },

  senderName: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: 12, marginBottom: 2,
  },

  text: {
    fontSize: t.fontSize.md, lineHeight: 21,
    fontFamily: t.typography.fontRegular,
  },
  textSent: { color: t.colors.bubbleSentText },
  textRecv: { color: t.colors.bubbleReceivedText },

  timeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 1 },
  time: { fontSize: 11, fontFamily: t.typography.fontRegular },
  timeSent: { color: t.colors.bubbleSentTime },
  timeRecv: { color: t.colors.bubbleReceivedTime },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingTop: 6,
    backgroundColor: t.colors.surface,
    borderTopWidth: 0.5, borderTopColor: t.colors.headerBorder,
  },
  textInput: {
    flex: 1,
    maxHeight: 120, minHeight: 40,
    color: t.colors.text,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md,
    backgroundColor: t.colors.inputBg,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 6,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
