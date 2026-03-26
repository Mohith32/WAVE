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
import { sendGroupMessage, addMessageHandler } from '../../../utils/websocket';
import { theme, ghostBorder } from '../../../utils/theme';
import { generateAesKey, generateIv, encryptMessage, decryptMessage } from '../../../utils/crypto';

export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserKeys, setCurrentUserKeys] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initChat();

    const removeHandler = addMessageHandler((msg) => {
      if (msg.type === 'group_message' && msg.data.groupId === groupId) {
        handleIncomingMessage(msg.data);
      }
    });

    return () => removeHandler();
  }, [groupId]);

  const initChat = async () => {
    const session = await storage.getSession();
    setCurrentUserId(session?.userId);
    
    const keys = await storage.getKeyPair();
    setCurrentUserKeys(keys);

    try {
      const histRes = await api.getGroupMessages(groupId);
      if (histRes.success) {
        const decryptedMessages = await Promise.all(
          histRes.data.map(m => processGroupMessage(m, session.userId))
        );
        setMessages(decryptedMessages.reverse());
      }
    } catch (e) {
      console.error('Failed to load group chat', e);
    } finally {
      setLoading(false);
    }
  };

  const processGroupMessage = async (m, myUserId) => {
    let text = m.encryptedContent ? '[Group Payload]' : (m.messageType === 'IMAGE' ? '📷 Image' : 'Message');
    
    if (m.encryptedContent && m.iv) {
      if (m.senderId === myUserId) {
        text = "You: " + text;
      }
    }

    return {
      _id: m.messageId,
      text: text,
      createdAt: new Date(m.timestamp),
      user: {
        _id: m.senderId,
        name: m.senderId === myUserId ? 'Me' : 'Node',
      },
      image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
    };
  };

  const handleIncomingMessage = async (m) => {
    const msg = await processGroupMessage(m, currentUserId);
    setMessages(prev => GiftedChat.append(prev, [msg]));
  };

  const onSend = useCallback(async (newMessages = []) => {
    const msg = newMessages[0];
    const text = msg.text.trim();
    if (!text) return;

    // Optimistic
    const pendingMsg = {
      ...msg,
      _id: Math.random().toString(),
      pending: true,
      user: { _id: currentUserId },
    };
    setMessages(prev => GiftedChat.append(prev, [pendingMsg]));

    sendGroupMessage(groupId, text, "group_aes_key_mock", "mock_iv", 'TEXT');
  }, [groupId, currentUserId]);

  const pickImage = async () => {};

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

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top || 40 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{groupName}</Text>
          <Text style={s.memberCount}>MULTI-NODE CHANNEL</Text>
        </View>
        <TouchableOpacity style={s.iconBtn}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={m => onSend(m)}
          user={{ _id: currentUserId || '' }}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          alwaysShowSend
          scrollToBottom
          renderUsernameOnMessage
          placeholder="BROADCAST MESSAGE..."
          textInputStyle={s.textInput}
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
  memberCount: { 
    fontSize: 9, 
    fontFamily: theme.typography.fontSemiBold, 
    color: theme.colors.secondary, 
    letterSpacing: 0.5 
  },
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
});
