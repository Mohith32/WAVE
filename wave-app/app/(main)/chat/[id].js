import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendChatMessage, addMessageHandler, sendTyping, sendReadReceipt } from '../../../utils/websocket';
import {
  generateAesKey, generateIv, encryptMessage, decryptMessage,
  encryptAesKey, decryptAesKey,
} from '../../../utils/crypto';
import Avatar from '../../../components/Avatar';
import { useTheme } from '../../../utils/theme';

const PAGE_SIZE = 30;

function formatTime(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const hh = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m} ${ampm}`;
}

function Bubble({ item, isMe, theme, s }) {
  const time = formatTime(new Date(item.createdAt));
  if (item.image) {
    return (
      <View style={[s.bubbleRow, isMe ? s.rowRight : s.rowLeft]}>
        <View style={[s.imageBubble, isMe ? s.sentBorder : s.recvBorder]}>
          <Image source={{ uri: item.image }} style={s.image} resizeMode="cover" />
          <View style={s.imageTimeRow}>
            <Text style={[s.time, isMe ? s.timeSent : s.timeRecv]}>{time}</Text>
            {isMe && (
              <Ionicons
                name={item.read ? 'checkmark-done' : item.sent ? 'checkmark' : 'time-outline'}
                size={14}
                color={theme.colors.bubbleSentTime}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[s.bubbleRow, isMe ? s.rowRight : s.rowLeft]}>
      <View style={[s.bubble, isMe ? s.sent : s.recv]}>
        <Text style={[s.text, isMe ? s.textSent : s.textRecv]}>{item.text}</Text>
        <View style={s.timeRow}>
          <Text style={[s.time, isMe ? s.timeSent : s.timeRecv]}>{time}</Text>
          {isMe && (
            <Ionicons
              name={item.read ? 'checkmark-done' : item.sent ? 'checkmark' : 'time-outline'}
              size={14}
              color={theme.colors.bubbleSentTime}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { id: receiverId, name: receiverName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [online, setOnline] = useState(false);

  const currentUserId = useRef(null);
  const myKeys = useRef(null);
  const receiverPublicKey = useRef(null);
  const pageRef = useRef(0);
  const typingTimeout = useRef(null);

  useEffect(() => {
    initChat();
    const remove = addMessageHandler(handleWsMessage);
    return () => {
      remove();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [receiverId]);

  const initChat = async () => {
    const session = await storage.getSession();
    currentUserId.current = session?.userId;
    myKeys.current = await storage.getKeyPair();

    const [userRes, histRes] = await Promise.all([
      api.getUser(receiverId),
      api.getConversationPaged(session?.userId, receiverId, 0, PAGE_SIZE),
    ]);

    if (userRes.success) {
      receiverPublicKey.current = userRes.data.publicKey;
      setOnline(!!userRes.data.online);
    }

    if (histRes.success && myKeys.current) {
      const content = histRes.data.content || histRes.data;
      const decrypted = await Promise.all(content.map(m => processMessage(m, session.userId)));
      setMessages(decrypted);
      setHasEarlier((histRes.data.totalPages ?? 1) > 1);
    }

    if (histRes.data?.content?.some(m => m.senderId === receiverId)) {
      sendReadReceipt(receiverId);
    }
  };

  const processMessage = async (m, myUserId) => {
    let text = '[encrypted]';
    if (m.iv && myKeys.current) {
      try {
        if (m.senderId === myUserId && m.senderEncryptedAesKey) {
          const aesKey = await decryptAesKey(m.senderEncryptedAesKey, myKeys.current.privateKey);
          text = await decryptMessage(m.encryptedContent, aesKey, m.iv);
        } else if (m.senderId !== myUserId && m.encryptedAesKey) {
          const aesKey = await decryptAesKey(m.encryptedAesKey, myKeys.current.privateKey);
          text = await decryptMessage(m.encryptedContent, aesKey, m.iv);
        }
      } catch { text = '[Decryption failed]'; }
    } else if (m.messageType === 'TEXT' && !m.encryptedContent) {
      text = m.content || '';
    }
    return {
      _id: m.messageId,
      senderId: m.senderId,
      text: m.messageType === 'TEXT' ? text : '',
      image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
      createdAt: m.timestamp,
      sent: true,
      read: !!m.read,
    };
  };

  const handleWsMessage = useCallback(async (msg) => {
    if (msg.type === 'message' && (msg.data.senderId === receiverId || msg.data.receiverId === receiverId)) {
      const processed = await processMessage(msg.data, currentUserId.current);
      setMessages(prev => [processed, ...prev]);
      if (msg.data.senderId === receiverId) sendReadReceipt(receiverId);
    } else if (msg.type === 'typing' && msg.senderId === receiverId) {
      setIsTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
    } else if (msg.type === 'read_receipt') {
      setMessages(prev => prev.map(m => m.senderId === currentUserId.current ? { ...m, read: true } : m));
    } else if (msg.type === 'presence' && msg.userId === receiverId) {
      setOnline(!!msg.online);
    }
  }, [receiverId]);

  const onLoadEarlier = useCallback(async () => {
    if (loadingEarlier || !hasEarlier) return;
    setLoadingEarlier(true);
    pageRef.current++;
    const res = await api.getConversationPaged(currentUserId.current, receiverId, pageRef.current, PAGE_SIZE);
    if (res.success) {
      const content = res.data.content || [];
      const decrypted = await Promise.all(content.map(m => processMessage(m, currentUserId.current)));
      setMessages(prev => [...prev, ...decrypted]);
      setHasEarlier((res.data.totalPages ?? 1) > pageRef.current + 1);
    }
    setLoadingEarlier(false);
  }, [loadingEarlier, hasEarlier, receiverId]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !receiverPublicKey.current || !myKeys.current) return;
    setInput('');

    const localId = `pending-${Date.now()}`;
    const pending = {
      _id: localId,
      senderId: currentUserId.current,
      text,
      createdAt: new Date().toISOString(),
      sent: false,
    };
    setMessages(prev => [pending, ...prev]);

    try {
      const aesKey = await generateAesKey();
      const iv = await generateIv();
      const encContent = await encryptMessage(text, aesKey, iv);
      const encAesKeyReceiver = await encryptAesKey(aesKey, receiverPublicKey.current);
      const encAesKeySender = await encryptAesKey(aesKey, myKeys.current.publicKey);
      sendChatMessage(receiverId, encContent, encAesKeyReceiver, encAesKeySender, iv, 'TEXT');
    } catch {}
  }, [input, receiverId]);

  const onTextChange = useCallback((text) => {
    setInput(text);
    if (text.length > 0) sendTyping(receiverId);
  }, [receiverId]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets[0] && receiverPublicKey.current && myKeys.current) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop();
      const pending = {
        _id: `img-${Date.now()}`,
        senderId: currentUserId.current,
        image: asset.uri,
        createdAt: new Date().toISOString(),
        sent: false,
      };
      setMessages(prev => [pending, ...prev]);
      const uploadRes = await api.uploadFile(asset.uri, fileName, 'image/jpeg');
      if (uploadRes.success) {
        const aesKey = await generateAesKey();
        const iv = await generateIv();
        const encContent = await encryptMessage('Image', aesKey, iv);
        const encAesKeyReceiver = await encryptAesKey(aesKey, receiverPublicKey.current);
        const encAesKeySender = await encryptAesKey(aesKey, myKeys.current.publicKey);
        sendChatMessage(receiverId, encContent, encAesKeyReceiver, encAesKeySender, iv, 'IMAGE', {
          fileName: uploadRes.data.fileName,
          fileUrl: uploadRes.data.fileUrl,
          fileSize: uploadRes.data.fileSize,
        });
      }
    }
  }, [receiverId]);

  const renderItem = useCallback(({ item }) => (
    <Bubble item={item} isMe={item.senderId === currentUserId.current} theme={theme} s={s} />
  ), [theme, s]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 44 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Avatar name={receiverName} size={38} />
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{receiverName}</Text>
          <Text style={s.headerStatus}>
            {isTyping ? 'typing…' : online ? 'online' : 'last seen recently'}
          </Text>
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
          onEndReached={onLoadEarlier}
          onEndReachedThreshold={0.2}
          ListFooterComponent={loadingEarlier ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color={theme.colors.primary} />
          ) : null}
        />

        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity style={s.attachBtn} onPress={pickImage} hitSlop={6}>
            <Ionicons name="attach" size={24} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            placeholder="Message"
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={onTextChange}
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
  sentBorder: { borderBottomRightRadius: 4 },
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
    paddingHorizontal: 6, paddingTop: 6,
    backgroundColor: t.colors.surface,
    borderTopWidth: 0.5, borderTopColor: t.colors.headerBorder,
  },
  attachBtn: { padding: 10, paddingBottom: 12 },
  textInput: {
    flex: 1,
    maxHeight: 120, minHeight: 40,
    color: t.colors.text,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md,
    backgroundColor: t.colors.inputBg,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4, marginBottom: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
