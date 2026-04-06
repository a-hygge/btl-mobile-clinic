import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, SystemMessage } from 'react-native-gifted-chat';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, systemColors } from '../../constants/theme';
import {
  sendChatMessage,
  getSessionMessages,
  type ChatMessageItem,
} from '../../services/chat.service';

const AI_USER = {
  _id: 'ai-assistant',
  name: 'AI Health Assistant',
  avatar: undefined,
};

function mapToGiftedMessage(msg: ChatMessageItem): IMessage {
  return {
    _id: msg.id,
    text: msg.content,
    createdAt: new Date(msg.createdAt),
    user: msg.role === 'USER' ? { _id: 'current-user' } : AI_USER,
  };
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isTyping, setIsTyping] = useState(false);

  // Add system disclaimer on mount
  useEffect(() => {
    setMessages([
      {
        _id: 'system-disclaimer',
        text: 'This AI assistant provides general health guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment.',
        createdAt: new Date(),
        user: AI_USER,
        system: true,
      },
    ]);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    try {
      const data = await getSessionMessages(id);
      setSessionId(id);

      const mapped = data.messages.map(mapToGiftedMessage).reverse();
      setMessages([
        ...mapped,
        {
          _id: 'system-disclaimer',
          text: 'This AI assistant provides general health guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment.',
          createdAt: new Date(data.session.createdAt),
          user: AI_USER,
          system: true,
        },
      ]);
    } catch {
      // Session load failed — stay on empty chat
    }
  }, []);

  const handleSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const userMessage = newMessages[0];
      if (!userMessage) return;

      setMessages((prev) => GiftedChat.append(prev, newMessages));
      setIsTyping(true);

      try {
        const response = await sendChatMessage(userMessage.text, sessionId);

        if (!sessionId) {
          setSessionId(response.sessionId);
        }

        const aiMsg: IMessage = {
          _id: response.aiMessage.id,
          text: response.aiMessage.content,
          createdAt: new Date(response.aiMessage.createdAt),
          user: AI_USER,
        };

        setMessages((prev) => GiftedChat.append(prev, [aiMsg]));
      } catch {
        const errorMsg: IMessage = {
          _id: `error-${Date.now()}`,
          text: 'Sorry, I encountered an error. Please try again.',
          createdAt: new Date(),
          user: AI_USER,
        };
        setMessages((prev) => GiftedChat.append(prev, [errorMsg]));
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId]
  );

  const handleNewChat = useCallback(() => {
    setSessionId(undefined);
    setMessages([
      {
        _id: 'system-disclaimer',
        text: 'This AI assistant provides general health guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment.',
        createdAt: new Date(),
        user: AI_USER,
        system: true,
      },
    ]);
  }, []);

  const renderBubble = useCallback(
    (props: React.ComponentProps<typeof Bubble>) => (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: systemColors.gray6,
            borderRadius: 18,
            borderBottomLeftRadius: 4,
          },
          right: {
            backgroundColor: systemColors.blue,
            borderRadius: 18,
            borderBottomRightRadius: 4,
          },
        }}
        textStyle={{
          left: { color: theme.colors.onSurface, fontSize: 15 },
          right: { color: '#fff', fontSize: 15 },
        }}
      />
    ),
    []
  );

  const renderInputToolbar = useCallback(
    (props: React.ComponentProps<typeof InputToolbar>) => (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    ),
    []
  );

  const renderSend = useCallback(
    (props: React.ComponentProps<typeof Send>) => (
      <Send {...props} containerStyle={styles.sendContainer}>
        <View style={styles.sendButton}>
          <MaterialCommunityIcons name="send" size={22} color="#fff" />
        </View>
      </Send>
    ),
    []
  );

  const renderSystemMessage = useCallback(
    (props: React.ComponentProps<typeof SystemMessage>) => (
      <SystemMessage
        {...props}
        textStyle={styles.systemMessageText}
        containerStyle={styles.systemMessageContainer}
      />
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="robot-happy-outline" size={24} color="#fff" />
            </View>
            <View>
              <Text variant="titleMedium" style={styles.headerTitle}>
                AI Health Assistant
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                Describe your symptoms
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={handleNewChat} style={styles.headerButton}>
              <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/chat-history' as never)}
              style={styles.headerButton}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Chat */}
      <GiftedChat
        messages={messages}
        onSend={handleSend}
        user={{ _id: 'current-user' }}
        isTyping={isTyping}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        renderSystemMessage={renderSystemMessage}
        placeholder="Describe your symptoms..."
        alwaysShowSend
        bottomOffset={insets.bottom}
        textInputProps={{
          style: styles.textInput,
        }}
      />
    </View>
  );
}

// Expose loadSession so chat-history can navigate with a session ID
ChatScreen.loadSession = undefined as ((id: string) => Promise<void>) | undefined;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: systemColors.gray5,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.onSurface,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: systemColors.gray6,
    borderRadius: 20,
    marginRight: 8,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: systemColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemMessageText: {
    fontSize: 12,
    color: systemColors.gray,
    textAlign: 'center',
  },
  systemMessageContainer: {
    marginBottom: 12,
  },
});
