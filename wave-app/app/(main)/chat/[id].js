import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar, Composer } from 'react-native-gifted-chat';
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

export default function ChatRoomScreen() {
  const { id: receiverId, name: receiverName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
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
      const decrypted = await decryptBatch(content, session.userId);
      setMessages(decrypted.reverse());
      setHasEarlier((histRes.data.totalPages ?? 1) > 1);
    }

    if (histRes.data?.content?.some(m => m.senderId === receiverId)) {
      sendReadReceipt(receiverId);
    }
  };

  const decryptBatch = async (msgs, myUserId) =>
    Promise.all(msgs.map(m => processMessage(m, myUserId)));

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
      } catch {
        text = '[Decryption failed]';
      }
    } else if (m.messageType === 'TEXT' && !m.encryptedContent) {
      text = m.content || '';
    }

    return {
      _id: m.messageId,
      text: m.messageType === 'TEXT' ? text : (m.messageType === 'IMAGE' ? '' : '📄 File'),
      createdAt: new Date(m.timestamp),
      user: { _id: m.senderId, name: m.senderId === myUserId ? 'Me' : receiverName },
      image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
      sent: true,
      received: !!m.read,
    };
  };

  const handleWsMessage = useCallback(async (msg) => {
    if (msg.type === 'message' && (msg.data.senderId === receiverId || msg.data.receiverId === receiverId)) {
      const processed = await processMessage(msg.data, currentUserId.current);
      setMessages(prev => GiftedChat.append(prev, [processed]));
      if (msg.data.senderId === receiverId) sendReadReceipt(receiverId);
    } else if (msg.type === 'typing' && msg.senderId === receiverId) {
      setIsTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
    } else if (msg.type === 'read_receipt') {
      setMessages(prev => prev.map(m =>
        m.user._id === currentUserId.current ? { ...m, received: true } : m
      ));
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
      const decrypted = await decryptBatch(content, currentUserId.current);
      setMessages(prev => [...prev, ...decrypted.reverse()]);
      setHasEarlier((res.data.totalPages ?? 1) > pageRef.current + 1);
    }
    setLoadingEarlier(false);
  }, [loadingEarlier, hasEarlier, receiverId]);

  const onSend = useCallback(async (newMessages = []) => {
    const text = newMessages[0]?.text?.trim();
    if (!text || !receiverPublicKey.current || !myKeys.current) return;

    const pending = {
      ...newMessages[0],
      _id: `pending-${Date.now()}`,
      pending: true,
      sent: false,
      user: { _id: currentUserId.current },
    };
    setMessages(prev => GiftedChat.append(prev, [pending]));

    try {
      const aesKey = await generateAesKey();
      const iv = await generateIv();
      const encContent = await encryptMessage(text, aesKey, iv);
      const encAesKeyReceiver = await encryptAesKey(aesKey, receiverPublicKey.current);
      const encAesKeySender = await encryptAesKey(aesKey, myKeys.current.publicKey);
      sendChatMessage(receiverId, encContent, encAesKeyReceiver, encAesKeySender, iv, 'TEXT');
    } catch {}
  }, [receiverId]);

  const onInputTextChanged = useCallback((text) => {
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
        _id: `img-${Date.now()}`, createdAt: new Date(),
        user: { _id: currentUserId.current }, image: asset.uri, pending: true,
      };
      setMessages(prev => GiftedChat.append(prev, [pending]));
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

  const renderBubble = useCallback((props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: theme.colors.bubbleSent,
          borderRadius: 14,
          borderBottomRightRadius: 4,
          marginBottom: 2,
          paddingHorizontal: 2,
        },
        left: {
          backgroundColor: theme.colors.bubbleReceived,
          borderRadius: 14,
          borderBottomLeftRadius: 4,
          marginBottom: 2,
          paddingHorizontal: 2,
          borderWidth: theme.isDark ? 0 : 0.5,
          borderColor: theme.colors.bubbleBorder,
        },
      }}
      textStyle={{
        right: {
          color: theme.colors.bubbleSentText,
          fontFamily: theme.typography.fontRegular,
          fontSize: theme.fontSize.md,
          lineHeight: 21,
        },
        left: {
          color: theme.colors.bubbleReceivedText,
          fontFamily: theme.typography.fontRegular,
          fontSize: theme.fontSize.md,
          lineHeight: 21,
        },
      }}
      timeTextStyle={{
        right: { color: theme.colors.bubbleSentTime, fontSize: 11 },
        left: { color: theme.colors.bubbleReceivedTime, fontSize: 11 },
      }}
      renderTicks={(msg) => {
        if (msg.user._id !== currentUserId.current) return null;
        return (
          <View style={{ flexDirection: 'row', marginRight: 8, marginBottom: 4 }}>
            <Ionicons
              name={msg.received ? 'checkmark-done' : msg.sent ? 'checkmark' : 'time-outline'}
              size={14}
              color={theme.colors.bubbleSentTime}
            />
          </View>
        );
      }}
    />
  ), [theme, s]);

  const renderSend = useCallback((props) => (
    <Send {...props} containerStyle={s.sendContainer}>
      <View style={s.sendBtn}>
        <Ionicons name="send" size={18} color="#fff" />
      </View>
    </Send>
  ), [s]);

  const renderInputToolbar = useCallback((props) => (
    <InputToolbar
      {...props}
      containerStyle={s.inputToolbar}
      primaryStyle={{ alignItems: 'center' }}
    />
  ), [s]);

  const renderComposer = useCallback((props) => (
    <Composer
      {...props}
      textInputStyle={s.textInput}
      placeholderTextColor={theme.colors.textMuted}
    />
  ), [s, theme]);

  const renderActions = useCallback(() => (
    <TouchableOpacity style={s.actionBtn} onPress={pickImage}>
      <Ionicons name="attach" size={26} color={theme.colors.textMuted} />
    </TouchableOpacity>
  ), [pickImage, theme, s]);

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

      <View style={{ flex: 1, backgroundColor: theme.colors.chatBg }}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: currentUserId.current || '' }}
          onInputTextChanged={onInputTextChanged}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderActions={renderActions}
          isTyping={isTyping}
          loadEarlier={hasEarlier}
          isLoadingEarlier={loadingEarlier}
          onLoadEarlier={onLoadEarlier}
          placeholder="Message"
          alwaysShowSend
          scrollToBottom
          renderAvatar={null}
          maxComposerHeight={120}
          minComposerHeight={40}
          bottomOffset={insets.bottom}
          messagesContainerStyle={{ backgroundColor: theme.colors.chatBg, paddingBottom: 4 }}
        />
      </View>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.colors.headerBg,
    paddingBottom: 10, paddingHorizontal: 8,
    borderBottomWidth: 0.5, borderBottomColor: t.colors.headerBorder,
  },
  backBtn: { padding: 6, marginRight: 2 },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: {
    fontFamily: t.typography.fontSemiBold,
    fontSize: t.fontSize.lg,
    color: t.colors.text,
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: t.typography.fontRegular,
    color: t.colors.textSecondary,
    marginTop: 1,
  },
  headerBtn: { padding: 8 },

  inputToolbar: {
    backgroundColor: t.colors.surface,
    borderTopWidth: 0.5, borderTopColor: t.colors.headerBorder,
    paddingTop: 4, paddingBottom: 4, paddingHorizontal: 4,
    minHeight: 52,
  },
  sendContainer: {
    justifyContent: 'center', alignItems: 'center',
    paddingRight: 6, paddingBottom: 4,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: t.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  textInput: {
    color: t.colors.text,
    fontFamily: t.typography.fontRegular,
    fontSize: t.fontSize.md,
    backgroundColor: t.colors.inputBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10, paddingBottom: 10,
    marginLeft: 4, marginRight: 4,
    marginTop: 4, marginBottom: 4,
    minHeight: 40,
  },
  actionBtn: {
    padding: 8, justifyContent: 'center',
  },
});
