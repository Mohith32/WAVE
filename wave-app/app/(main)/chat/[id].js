import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Alert, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../../../components/Avatar';
import ActionSheet from '../../../components/ActionSheet';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendChatMessage, addMessageHandler, sendTyping, sendReadReceipt } from '../../../utils/websocket';
import {
  generateAesKey, generateIv, encryptMessage, decryptMessage,
  encryptAesKey, decryptAesKey,
} from '../../../utils/crypto';
import { setActiveChatPeer } from '../../../utils/notifications';
import { useTheme } from '../../../utils/theme';

const PAGE_SIZE = 30;

const formatTime = (date) => {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const hh = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m} ${ampm}`;
};

function Bubble({ item, isMe, theme, s }) {
  const time = formatTime(new Date(item.createdAt));

  if (item.image) {
    return (
      <View style={[s.row, isMe ? s.rowR : s.rowL]}>
        <View style={[s.imgBubble, isMe ? s.imgSent : s.imgRecv]}>
          <Image source={{ uri: item.image }} style={s.img} resizeMode="cover" />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.row, isMe ? s.rowR : s.rowL]}>
      <View style={[s.bubble, isMe ? s.sent : s.recv]}>
        <Text style={[s.text, isMe ? s.textSent : s.textRecv]}>{item.text}</Text>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const currentUserId = useRef(null);
  const myKeys = useRef(null);
  const receiverPublicKey = useRef(null);
  const pageRef = useRef(0);
  const typingTimeout = useRef(null);

  useEffect(() => {
    setActiveChatPeer(receiverId);
    initChat();
    storage.isMuted(receiverId).then(setMuted);
    const remove = addMessageHandler(handleWsMessage);
    return () => {
      setActiveChatPeer(null);
      remove();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [receiverId]);

  const handleViewProfile = () => {
    Alert.alert(
      receiverName || 'Profile',
      `@${receiverName?.toLowerCase().replace(/\s/g, '_') || 'user'}\n\nMore profile features coming soon.`,
      [{ text: 'OK' }]
    );
  };

  const handleToggleMute = async () => {
    const nowMuted = await storage.toggleMute(receiverId);
    setMuted(nowMuted);
    Alert.alert(
      nowMuted ? 'Muted' : 'Unmuted',
      nowMuted
        ? `You won't get notifications from ${receiverName}.`
        : `Notifications from ${receiverName} are on.`,
    );
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear chat?',
      `This deletes all messages between you and ${receiverName}. Both sides lose the history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            const res = await api.clearConversation(receiverId);
            if (res.success) {
              setMessages([]);
              Alert.alert('Cleared', 'Conversation deleted.');
            } else {
              Alert.alert('Error', res.message || 'Could not clear chat.');
            }
          },
        },
      ]
    );
  };

  const handleUnfriend = () => {
    Alert.alert(
      `Remove ${receiverName}?`,
      "You'll be removed from each other's contacts.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const res = await api.unfriend(receiverId);
            if (res.success) {
              Alert.alert('Removed', `${receiverName} is no longer a mate.`);
              router.back();
            } else {
              Alert.alert('Error', res.message || 'Could not remove.');
            }
          },
        },
      ]
    );
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Chat with ${receiverName} on Wave`,
      });
    } catch {}
  };

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
      _id: localId, senderId: currentUserId.current,
      text, createdAt: new Date().toISOString(), sent: false,
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
        _id: `img-${Date.now()}`, senderId: currentUserId.current,
        image: asset.uri, createdAt: new Date().toISOString(), sent: false,
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
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Avatar name={receiverName} size={32} showOnline online={online} />
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerName} numberOfLines={1}>{receiverName}</Text>
            <Text style={s.headerStatus}>
              {isTyping ? 'typing…' : online ? 'online' : 'last seen recently'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={theme.colors.primary} />
        </Pressable>
      </View>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={receiverName}
        actions={[
          { icon: 'person-circle-outline', label: 'View Profile', onPress: handleViewProfile },
          { icon: muted ? 'notifications' : 'notifications-off-outline',
            label: muted ? 'Unmute Notifications' : 'Mute Notifications',
            onPress: handleToggleMute },
          { icon: 'share-outline', label: 'Share', onPress: handleShareProfile },
          { icon: 'trash-outline', label: 'Clear Chat', destructive: true, onPress: handleClearChat },
          { icon: 'person-remove-outline', label: 'Remove from Contacts', destructive: true, onPress: handleUnfriend },
        ]}
      />

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
          onEndReached={onLoadEarlier}
          onEndReachedThreshold={0.2}
          ListFooterComponent={loadingEarlier ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color={theme.colors.primary} />
          ) : null}
        />

        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable onPress={pickImage} style={({ pressed }) => [s.attachBtn, pressed && { opacity: 0.5 }]}>
            <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
          </Pressable>
          <View style={s.inputWrap}>
            <TextInput
              style={s.textInput}
              placeholder="Send Message"
              placeholderTextColor={theme.colors.textMuted}
              value={input}
              onChangeText={onTextChange}
              multiline
              maxLength={4000}
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
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    marginLeft: 8, marginRight: 8,
  },
  headerName: { fontFamily: t.typography.fontSemiBold, fontSize: 16, color: t.colors.text, letterSpacing: -0.2 },
  headerStatus: { fontSize: 12, fontFamily: t.typography.fontRegular, color: t.colors.textMuted, marginTop: 1 },

  listContent: { paddingVertical: 10, paddingHorizontal: 10 },
  row: { flexDirection: 'row', marginVertical: 2 },
  rowL: { justifyContent: 'flex-start' },
  rowR: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18,
  },
  sent: { backgroundColor: t.colors.bubbleSent },
  recv: { backgroundColor: t.colors.bubbleReceived },

  imgBubble: { maxWidth: '78%', borderRadius: 18, overflow: 'hidden' },
  imgSent: {},
  imgRecv: {},
  img: { width: 240, height: 240 },

  text: { fontSize: 16, lineHeight: 21, fontFamily: t.typography.fontRegular },
  textSent: { color: t.colors.bubbleSentText },
  textRecv: { color: t.colors.bubbleReceivedText },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: t.colors.headerBg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.hairline,
  },
  attachBtn: {
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
    marginBottom: 5,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.hairline,
    borderRadius: 20, paddingLeft: 14, paddingRight: 4,
    minHeight: 36, maxHeight: 120,
    backgroundColor: t.colors.surface,
  },
  textInput: {
    flex: 1,
    color: t.colors.text, fontFamily: t.typography.fontRegular,
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
