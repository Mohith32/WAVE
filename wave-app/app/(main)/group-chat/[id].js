import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar, Composer } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { sendGroupMessage, addMessageHandler } from '../../../utils/websocket';
import { useTheme } from '../../../utils/theme';
import { getAvatarColor } from '../../../components/Avatar';

export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);

  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

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
    try {
      const histRes = await api.getGroupMessages(groupId);
      if (histRes.success) {
        const mapped = histRes.data.map(m => processGroupMessage(m, session.userId));
        setMessages(mapped.reverse());
      }
    } catch (e) {
      console.error('Failed to load group chat', e);
    }
  };

  const processGroupMessage = (m, myUserId) => ({
    _id: m.messageId,
    text: m.encryptedContent || (m.messageType === 'IMAGE' ? '' : ''),
    createdAt: new Date(m.timestamp),
    user: { _id: m.senderId, name: m.senderId === myUserId ? 'Me' : 'Member' },
    image: m.messageType === 'IMAGE' ? api.getFileUrl(m.fileName) : undefined,
    sent: true,
  });

  const handleIncomingMessage = (m) => {
    const msg = processGroupMessage(m, currentUserId);
    setMessages(prev => GiftedChat.append(prev, [msg]));
  };

  const onSend = useCallback(async (newMessages = []) => {
    const msg = newMessages[0];
    const text = msg.text.trim();
    if (!text) return;
    const pendingMsg = {
      ...msg, _id: Math.random().toString(), pending: true,
      user: { _id: currentUserId },
    };
    setMessages(prev => GiftedChat.append(prev, [pendingMsg]));
    sendGroupMessage(groupId, text, 'none', 'none', 'none', 'TEXT');
  }, [groupId, currentUserId]);

  const renderBubble = useCallback((props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: theme.colors.bubbleSent,
          borderRadius: 14, borderBottomRightRadius: 4, marginBottom: 2,
        },
        left: {
          backgroundColor: theme.colors.bubbleReceived,
          borderRadius: 14, borderBottomLeftRadius: 4, marginBottom: 2,
          borderWidth: theme.isDark ? 0 : 0.5, borderColor: theme.colors.bubbleBorder,
        },
      }}
      textStyle={{
        right: {
          color: theme.colors.bubbleSentText,
          fontFamily: theme.typography.fontRegular,
          fontSize: theme.fontSize.md, lineHeight: 21,
        },
        left: {
          color: theme.colors.bubbleReceivedText,
          fontFamily: theme.typography.fontRegular,
          fontSize: theme.fontSize.md, lineHeight: 21,
        },
      }}
      timeTextStyle={{
        right: { color: theme.colors.bubbleSentTime, fontSize: 11 },
        left: { color: theme.colors.bubbleReceivedTime, fontSize: 11 },
      }}
      usernameStyle={{ color: getAvatarColor(props.currentMessage?.user?.name), fontFamily: theme.typography.fontSemiBold, fontSize: 12 }}
    />
  ), [theme]);

  const renderSend = useCallback((props) => (
    <Send {...props} containerStyle={s.sendContainer}>
      <View style={s.sendBtn}>
        <Ionicons name="send" size={18} color="#fff" />
      </View>
    </Send>
  ), [s]);

  const renderInputToolbar = useCallback((props) => (
    <InputToolbar {...props} containerStyle={s.inputToolbar} primaryStyle={{ alignItems: 'center' }} />
  ), [s]);

  const renderComposer = useCallback((props) => (
    <Composer {...props} textInputStyle={s.textInput} placeholderTextColor={theme.colors.textMuted} />
  ), [s, theme]);

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
          <Text style={s.headerStatus}>group</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: theme.colors.chatBg }}>
        <GiftedChat
          messages={messages}
          onSend={m => onSend(m)}
          user={{ _id: currentUserId || '' }}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          alwaysShowSend
          scrollToBottom
          renderUsernameOnMessage
          placeholder="Message"
          renderAvatar={null}
          bottomOffset={insets.bottom}
          messagesContainerStyle={{ backgroundColor: theme.colors.chatBg }}
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
  groupAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
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
});
