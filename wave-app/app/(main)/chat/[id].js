import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendChatMessage, addMessageHandler, sendTyping, sendReadReceipt } from '../../../utils/websocket';
import { generateAesKey, generateIv, encryptMessage, decryptMessage, encryptAesKey, decryptAesKey } from '../../../utils/crypto';
import { theme, ghostBorder } from '../../../utils/theme';

export default function ChatRoomScreen() {
  const { id: receiverId, name: receiverName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserKeys, setCurrentUserKeys] = useState(null);
  const [receiverKey, setReceiverKey] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typeTimeout, setTypeTimeout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initChat();

    const removeHandler = addMessageHandler((msg) => {
      if (msg.type === 'message' && (msg.data.senderId === receiverId || msg.data.receiverId === receiverId)) {
        handleIncomingMessage(msg.data);
      } else if (msg.type === 'message_sent' && msg.data.receiverId === receiverId) {
        handleSentMessageConfirmation(msg.data);
      } else if (msg.type === 'typing' && msg.senderId === receiverId) {
        setIsTyping(true);
        if (typeTimeout) clearTimeout(typeTimeout);
        setTypeTimeout(setTimeout(() => setIsTyping(false), 3000));
      } else if (msg.type === 'read_receipt' && msg.readBy === receiverId) {
        setMessages(prev => prev.map(m => m.user._id === currentUserId ? { ...m, received: true, pending: false } : m));
      }
    });

    return () => removeHandler();
  }, [receiverId]);

  const initChat = async () => {
    const session = await storage.getSession();
    setCurrentUserId(session?.userId);
    
    const keys = await storage.getKeyPair();
    setCurrentUserKeys(keys);

    try {
      const userRes = await api.getUser(receiverId);
      if (userRes.success) {
        setReceiverKey(userRes.data.publicKey);
      }

      const histRes = await api.getConversation(session?.userId, receiverId);
      if (histRes.success && keys) {
        const decryptedMessages = await Promise.all(
          histRes.data.map(m => processStoredMessage(m, keys.privateKey, session.userId))
        );
        setMessages(decryptedMessages.reverse());
      }
      
      if (histRes.data?.some(m => m.senderId === receiverId && !m.read)) {
        sendReadReceipt(receiverId);
      }
    } catch (e) {
      console.error('Failed to init chat', e);
    } finally {
      setLoading(false);
    }
  };

  const processStoredMessage = async (m, myPrivateKey, myUserId) => {
    let text = '[Unable to decrypt]';
    
    if (m.encryptedContent && m.encryptedAesKey && m.iv) {
      try {
        if (m.senderId === myUserId) {
          text = await decryptMessage(m.encryptedContent, m.encryptedAesKey, m.iv);
        } else {
          const aesKey = await decryptAesKey(m.encryptedAesKey, myPrivateKey);
          text = await decryptMessage(m.encryptedContent, aesKey, m.iv);
        }
      } catch (e) {
        console.log('Decryption failed for msg', m.messageId);
      }
    }

    return {
      _id: m.messageId,
      text: m.messageType === 'TEXT' ? text : (m.messageType === 'IMAGE' ? '📷 Image' : '📄 Document'),
      createdAt: new Date(m.timestamp),
      user: {
        _id: m.senderId,
        name: m.senderId === myUserId ? 'Me' : receiverName,
      },
      image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
      received: m.read || m.delivered,
    };
  };

  const handleIncomingMessage = async (m) => {
    if (!currentUserKeys) return;
    const msg = await processStoredMessage(m, currentUserKeys.privateKey, currentUserId);
    setMessages(previousMessages => GiftedChat.append(previousMessages, [msg]));
    
    if (m.senderId === receiverId) {
      sendReadReceipt(receiverId);
    }
  };

  const handleSentMessageConfirmation = (m) => {};

  const onSend = useCallback(async (newMessages = []) => {
    const msg = newMessages[0];
    const text = msg.text.trim();
    if (!text || !receiverKey) return;

    const pendingMsg = {
      ...msg,
      _id: Math.random().toString(),
      pending: true,
      user: { _id: currentUserId },
    };
    setMessages(previousMessages => GiftedChat.append(previousMessages, [pendingMsg]));

    try {
      const aesKey = await generateAesKey();
      const iv = await generateIv();
      
      const encryptedContent = await encryptMessage(text, aesKey, iv);
      const encryptedAesKey = await encryptAesKey(aesKey, receiverKey);
      
      sendChatMessage(receiverId, encryptedContent, encryptedAesKey, iv, 'TEXT');
    } catch (e) {
      console.error('Failed to send encrypted msg', e);
    }
  }, [receiverKey, currentUserId]);

  const onInputTextChanged = (text) => {
    if (text.length > 0) {
      sendTyping(receiverId);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    
    if (!result.canceled && result.assets[0] && receiverKey) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop();
      
      const pendingMsg = {
        _id: Math.random().toString(),
        createdAt: new Date(),
        user: { _id: currentUserId },
        image: asset.uri,
        pending: true,
      };
      setMessages(prev => GiftedChat.append(prev, [pendingMsg]));

      try {
        const uploadRes = await api.uploadFile(asset.uri, fileName, 'image/jpeg');
        if (uploadRes.success) {
          const aesKey = await generateAesKey();
          const iv = await generateIv();
          
          const encContent = await encryptMessage('Image', aesKey, iv);
          const encAesKey = await encryptAesKey(aesKey, receiverKey);
          
          sendChatMessage(receiverId, encContent, encAesKey, iv, 'IMAGE', {
            fileName: uploadRes.data.fileName,
            fileUrl: uploadRes.data.fileUrl,
            fileSize: uploadRes.data.fileSize,
          });
        }
      } catch (e) {
        console.error('Image upload failed', e);
      }
    }
  };

  // Asymmetrical Fluid Bubbles
  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: [
            { backgroundColor: theme.colors.surfaceHigh },
            ghostBorder,
            { borderTopLeftRadius: theme.borderRadius.xl, borderBottomLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.sm }
          ],
          left: [
            { backgroundColor: theme.colors.surfaceBase },
            ghostBorder,
            { borderTopLeftRadius: theme.borderRadius.xl, borderBottomLeftRadius: theme.borderRadius.sm, borderTopRightRadius: theme.borderRadius.xl, borderBottomRightRadius: theme.borderRadius.xl }
          ],
        }}
        containerToNextStyle={{
           right: { borderBottomRightRadius: theme.borderRadius.sm },
           left: { borderBottomLeftRadius: theme.borderRadius.sm }
        }}
        textStyle={{
          right: { color: theme.colors.text, fontSize: theme.fontSize.md, fontFamily: theme.typography.fontRegular, letterSpacing: 0.3 },
          left: { color: theme.colors.text, fontSize: theme.fontSize.md, fontFamily: theme.typography.fontRegular, letterSpacing: 0.3 },
        }}
        timeTextStyle={{
          right: { color: theme.colors.textVariant, fontFamily: theme.typography.fontLight, fontSize: 10 },
          left: { color: theme.colors.textVariant, fontFamily: theme.typography.fontLight, fontSize: 10 },
        }}
      />
    );
  };

  const renderSend = (props) => (
    <Send {...props} containerStyle={{ justifyContent: 'center', marginRight: 16 }}>
      <Ionicons name="paper-plane" size={24} color={theme.colors.primary} />
    </Send>
  );

  const renderInputToolbar = (props) => (
    <View style={{ marginBottom: Math.max(insets.bottom, 12), paddingHorizontal: 16 }}>
      <BlurView tint="dark" intensity={60} style={[s.inputToolbarBlur, ghostBorder]}>
        <InputToolbar
          {...props}
          containerStyle={{
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            paddingVertical: 2,
          }}
          primaryStyle={{ alignItems: 'center' }}
        />
      </BlurView>
    </View>
  );

  const renderActions = () => (
    <TouchableOpacity style={s.actionBtn} onPress={pickImage}>
      <Ionicons name="add" size={26} color={theme.colors.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top || 40 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{receiverName}</Text>
          <View style={s.e2eeBadge}>
            <Ionicons name="shield-checkmark" size={10} color={theme.colors.secondary} />
            <Text style={s.e2eeText}>E2E ENCRYPTED CONNECTION</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Area */}
      <View style={s.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={m => onSend(m)}
          user={{ _id: currentUserId || '' }}
          onInputTextChanged={onInputTextChanged}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          renderActions={renderActions}
          isTyping={isTyping}
          placeholder="SECURE MESSAGE..."
          textInputStyle={s.textInput}
          alwaysShowSend
          scrollToBottom
          renderAvatar={null}
          bottomOffset={0}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 16, paddingHorizontal: 12,
  },
  backBtn: { padding: 8 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { 
    fontSize: theme.fontSize.lg, 
    fontFamily: theme.typography.fontSemiBold, 
    color: theme.colors.primary, 
    letterSpacing: 1, 
    marginBottom: 2 
  },
  e2eeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  e2eeText: { 
    fontSize: 9, 
    fontFamily: theme.typography.fontSemiBold, 
    color: theme.colors.secondary, 
    letterSpacing: 0.5 
  },
  headerActions: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surfaceLow,
    justifyContent: 'center', alignItems: 'center',
  },
  chatContainer: { flex: 1 },
  inputToolbarBlur: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  textInput: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontRegular,
    fontSize: theme.fontSize.sm,
    letterSpacing: 1,
    paddingTop: 10,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  actionBtn: { padding: 8, paddingLeft: 16 },
});
