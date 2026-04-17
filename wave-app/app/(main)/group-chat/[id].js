import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, Image,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendGroupMessage, addMessageHandler } from '../../../utils/websocket';
import { useTheme } from '../../../utils/theme';
import { getAvatarColor } from '../../../components/Avatar';

const formatTime = (date) => {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const hh = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m} ${ampm}`;
};

function Bubble({ item, isMe, theme, s }) {
  const senderColor = getAvatarColor(item.senderName || item.senderId);
  if (item.image) {
    return (
      <View style={[s.row, isMe ? s.rowR : s.rowL]}>
        <View style={s.imgBubble}>
          {!isMe && item.senderName && <Text style={[s.senderName, { color: senderColor }]}>{item.senderName}</Text>}
          <Image source={{ uri: item.image }} style={s.img} resizeMode="cover" />
        </View>
      </View>
    );
  }
  return (
    <View style={[s.row, isMe ? s.rowR : s.rowL]}>
      <View style={[s.bubble, isMe ? s.sent : s.recv]}>
        {!isMe && item.senderName && <Text style={[s.senderName, { color: senderColor }]}>{item.senderName}</Text>}
        <Text style={[s.text, isMe ? s.textSent : s.textRecv]}>{item.text}</Text>
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
  const bg = getAvatarColor(groupName);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const currentUserId = useRef(null);

  useEffect(() => {
    initChat();
    const remove = addMessageHandler((msg) => {
      if (msg.type === 'group_message' && msg.data.groupId === groupId) {
        setMessages(prev => [processGroupMessage(msg.data, currentUserId.current), ...prev]);
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
    } catch (e) { console.error(e); }
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
      _id: `pending-${Date.now()}`, senderId: currentUserId.current,
      senderName: 'Me', text, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [pending, ...prev]);
    sendGroupMessage(groupId, text, 'none', 'none', 'none', 'TEXT');
  }, [input, groupId]);

  const renderItem = useCallback(({ item }) => (
    <Bubble item={item} isMe={item.senderId === currentUserId.current} theme={theme} s={s} />
  ), [theme, s]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={[s.clanAvatar, { backgroundColor: bg }]}>
            <Ionicons name="people" size={18} color="#fff" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerName} numberOfLines={1}>{groupName}</Text>
            <Text style={s.headerStatus}>clan</Text>
          </View>
        </View>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={theme.colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 50) : 0}
      >
        <FlatList
          style={{ flex: 1, backgroundColor: theme.colors.chatBg }}
          inverted
          data={messages}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
        />

        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.textInput}
              placeholder="Message"
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline maxLength={4000}
            />
            <Pressable
              onPress={onSend}
              disabled={!input.trim()}
              style={({ pressed }) => [s.sendBtn, !input.trim() && s.sendBtnDisabled, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
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
    paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.hairline,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginRight: 8 },
  clanAvatar: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerName: { fontFamily: t.typography.fontSemiBold, fontSize: 16, color: t.colors.text, maxWidth: 180, letterSpacing: -0.2 },
  headerStatus: { fontSize: 12, fontFamily: t.typography.fontRegular, color: t.colors.textMuted, marginTop: 1 },

  listContent: { paddingVertical: 10, paddingHorizontal: 10 },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowL: { justifyContent: 'flex-start' },
  rowR: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  sent: { backgroundColor: t.colors.bubbleSent },
  recv: { backgroundColor: t.colors.bubbleReceived },

  imgBubble: { maxWidth: '78%', borderRadius: 18, overflow: 'hidden', backgroundColor: t.colors.bubbleReceived },
  img: { width: 240, height: 240 },

  senderName: { fontFamily: t.typography.fontSemiBold, fontSize: 12, marginBottom: 3 },
  text: { fontSize: 16, lineHeight: 21, fontFamily: t.typography.fontRegular },
  textSent: { color: t.colors.bubbleSentText },
  textRecv: { color: t.colors.bubbleReceivedText },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: t.colors.headerBg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.hairline,
    borderRadius: 20, paddingLeft: 14, paddingRight: 4,
    minHeight: 36, maxHeight: 120,
    backgroundColor: t.colors.surface,
  },
  textInput: {
    flex: 1, color: t.colors.text, fontFamily: t.typography.fontRegular,
    fontSize: 16, paddingVertical: 7, padding: 0,
  },
  sendBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4, marginLeft: 4,
  },
  sendBtnDisabled: { backgroundColor: t.colors.textGhost },
});
