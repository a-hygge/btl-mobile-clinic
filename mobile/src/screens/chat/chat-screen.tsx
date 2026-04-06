import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, SystemMessage, Composer } from 'react-native-gifted-chat';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { theme, systemColors } from '../../constants/theme';
import {
  sendChatMessage,
  getSessionMessages,
  type ChatMessageItem,
} from '../../services/chat.service';

const AI_USER = {
  _id: 'ai-assistant',
  name: 'AI Assistant',
};

const DISCLAIMER: IMessage = {
  _id: 'system-disclaimer',
  text: 'I\'m your AI health assistant. I can help assess symptoms and suggest which specialist to visit. Note: This is not a medical diagnosis.',
  createdAt: new Date(),
  user: AI_USER,
  system: true,
};

// Tab bar height (NativeTabs ~49px + home indicator)
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

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
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const [messages, setMessages] = useState<IMessage[]>([DISCLAIMER]);
  const [sessionId, setSessionId] = useState<string | undefined>(params.sessionId);
  const [isTyping, setIsTyping] = useState(false);

  // Fade in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Load existing session
  useEffect(() => {
    if (params.sessionId) {
      void loadSession(params.sessionId);
    }
  }, [params.sessionId]);

  const loadSession = async (id: string) => {
    try {
      const data = await getSessionMessages(id);
      setSessionId(id);
      const mapped = data.messages.map(mapToGiftedMessage).reverse();
      setMessages([...mapped, { ...DISCLAIMER, createdAt: new Date(data.session.createdAt) }]);
    } catch {
      // stay on empty chat
    }
  };

  const handleSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const userMessage = newMessages[0];
      if (!userMessage) return;

      Keyboard.dismiss();
      setMessages((prev) => GiftedChat.append(prev, newMessages));
      setIsTyping(true);

      try {
        const response = await sendChatMessage(userMessage.text, sessionId);
        if (!sessionId) setSessionId(response.sessionId);

        const aiMsg: IMessage = {
          _id: response.aiMessage.id,
          text: response.aiMessage.content,
          createdAt: new Date(response.aiMessage.createdAt),
          user: AI_USER,
        };
        setMessages((prev) => GiftedChat.append(prev, [aiMsg]));
      } catch {
        setMessages((prev) =>
          GiftedChat.append(prev, [
            {
              _id: `error-${Date.now()}`,
              text: 'Sorry, something went wrong. Please try again.',
              createdAt: new Date(),
              user: AI_USER,
            },
          ])
        );
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId]
  );

  const handleNewChat = useCallback(() => {
    setSessionId(undefined);
    setMessages([{ ...DISCLAIMER, createdAt: new Date() }]);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="robot-happy-outline" size={22} color="#fff" />
            </View>
            <View>
              <Text variant="titleMedium" style={styles.headerTitle}>
                AI Health Assistant
              </Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text variant="labelSmall" style={styles.onlineText}>
                  Online
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={handleNewChat} hitSlop={12}>
              <MaterialCommunityIcons name="chat-plus-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.push('/chat-history' as never)} hitSlop={12}>
              <MaterialCommunityIcons name="history" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Quick prompts */}
        <View style={styles.promptsRow}>
          {['Headache', 'Stomach pain', 'Chest pain'].map((prompt) => (
            <Pressable
              key={prompt}
              style={styles.promptChip}
              onPress={() => void handleSend([{
                _id: `quick-${Date.now()}`,
                text: `I have ${prompt.toLowerCase()}`,
                createdAt: new Date(),
                user: { _id: 'current-user' },
              }])}
            >
              <Text variant="labelSmall" style={styles.promptText}>{prompt}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Chat area */}
      <View style={[styles.chatContainer, { marginBottom: TAB_BAR_HEIGHT }]}>
        <GiftedChat
          messages={messages}
          onSend={handleSend}
          user={{ _id: 'current-user' }}
          isTyping={isTyping}
          renderBubble={(props) => (
            <Bubble
              {...props}
              wrapperStyle={{
                left: styles.bubbleLeft,
                right: styles.bubbleRight,
              }}
              textStyle={{
                left: styles.bubbleTextLeft,
                right: styles.bubbleTextRight,
              }}
            />
          )}
          renderInputToolbar={(props) => (
            <InputToolbar
              {...props}
              containerStyle={styles.inputToolbar}
              primaryStyle={styles.inputPrimary}
            />
          )}
          renderComposer={(props) => (
            <Composer
              {...props}
              textInputStyle={styles.composer}
              placeholder="Ask about your symptoms..."
              placeholderTextColor={systemColors.gray2}
            />
          )}
          renderSend={(props) => (
            <Send {...props} containerStyle={styles.sendWrap}>
              <LinearGradient
                colors={['#007AFF', '#0051D5']}
                style={styles.sendBtn}
              >
                <MaterialCommunityIcons name="send" size={18} color="#fff" />
              </LinearGradient>
            </Send>
          )}
          renderSystemMessage={(props) => (
            <SystemMessage
              {...props}
              textStyle={styles.sysText}
              containerStyle={styles.sysContainer}
            />
          )}
          renderChatFooter={() =>
            isTyping ? (
              <View style={styles.typingWrap}>
                <LottieView
                  source={require('../../assets/animations/loading.json')}
                  autoPlay
                  loop
                  style={{ width: 40, height: 40 }}
                />
                <Text variant="bodySmall" style={styles.typingText}>AI is thinking...</Text>
              </View>
            ) : null
          }
          alwaysShowSend
          minInputToolbarHeight={56}
          bottomOffset={0}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  onlineText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  promptsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  promptChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  promptText: {
    color: '#fff',
    fontSize: 12,
  },
  chatContainer: {
    flex: 1,
  },
  bubbleLeft: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleRight: {
    backgroundColor: systemColors.blue,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleTextLeft: {
    color: theme.colors.onSurface,
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextRight: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  inputToolbar: {
    borderTopWidth: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  composer: {
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.onSurface,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: systemColors.gray6,
    borderRadius: 22,
    marginRight: 8,
    maxHeight: 100,
  },
  sendWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sysText: {
    fontSize: 12,
    color: systemColors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  sysContainer: {
    marginBottom: 8,
    marginHorizontal: 24,
  },
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 4,
  },
  typingText: {
    color: systemColors.gray,
    fontSize: 12,
  },
});
