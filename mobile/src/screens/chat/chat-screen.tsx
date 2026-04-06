import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
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

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isSystem?: boolean;
  createdAt: Date;
}

function toMessage(msg: ChatMessageItem): Message {
  return {
    id: msg.id,
    text: msg.content,
    isUser: msg.role === 'USER',
    createdAt: new Date(msg.createdAt),
  };
}

function RelativeTime({ date }: { date: Date }) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
  let label = 'just now';
  if (diff >= 1 && diff < 60) label = `${diff}m ago`;
  else if (diff >= 60 && diff < 1440) label = `${Math.floor(diff / 60)}h ago`;
  else if (diff >= 1440) label = date.toLocaleDateString();
  return <Text style={styles.time}>{label}</Text>;
}

function ChatBubble({ item }: { item: Message }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(item.isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (item.isSystem) {
    return (
      <Animated.View style={[styles.systemBubble, { opacity: fadeAnim }]}>
        <MaterialCommunityIcons name="information-outline" size={14} color={systemColors.gray} />
        <Text style={styles.systemText}>{item.text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        item.isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {!item.isUser && (
        <View style={styles.aiAvatar}>
          <MaterialCommunityIcons name="robot-happy-outline" size={16} color={systemColors.blue} />
        </View>
      )}
      <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, item.isUser && styles.userBubbleText]}>
          {item.text}
        </Text>
        <RelativeTime date={item.createdAt} />
      </View>
    </Animated.View>
  );
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'disclaimer',
      text: 'I\'m your AI health assistant. I can help assess symptoms and suggest specialists. This is not a medical diagnosis.',
      isUser: false,
      isSystem: true,
      createdAt: new Date(),
    },
  ]);
  const [sessionId, setSessionId] = useState<string | undefined>(params.sessionId);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (params.sessionId) {
      void loadSession(params.sessionId);
    }
  }, [params.sessionId]);

  const loadSession = async (id: string) => {
    try {
      const data = await getSessionMessages(id);
      setSessionId(id);
      setMessages(data.messages.map(toMessage));
    } catch {
      // stay on empty
    }
  };

  const scrollToEnd = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg || isTyping) return;

    setInputText('');
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: msg,
      isUser: true,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToEnd();
    setIsTyping(true);

    try {
      const response = await sendChatMessage(msg, sessionId);
      if (!sessionId) setSessionId(response.sessionId);

      setMessages((prev) => [
        ...prev,
        {
          id: response.aiMessage.id,
          text: response.aiMessage.content,
          isUser: false,
          createdAt: new Date(response.aiMessage.createdAt),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: 'Sorry, something went wrong. Please try again.',
          isUser: false,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [inputText, sessionId, isTyping]);

  const handleNewChat = useCallback(() => {
    setSessionId(undefined);
    setInputText('');
    setMessages([
      {
        id: 'disclaimer',
        text: 'I\'m your AI health assistant. I can help assess symptoms and suggest specialists. This is not a medical diagnosis.',
        isUser: false,
        isSystem: true,
        createdAt: new Date(),
      },
    ]);
  }, []);

  const quickPrompts = ['Headache', 'Stomach pain', 'Fever', 'Back pain', 'Cough'];

  return (
    <View style={styles.container}>
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
              <MaterialCommunityIcons name="robot-happy-outline" size={20} color="#fff" />
            </View>
            <View>
              <Text variant="titleMedium" style={styles.headerTitle}>AI Health Assistant</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={handleNewChat} hitSlop={12}>
              <MaterialCommunityIcons name="chat-plus-outline" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={() => router.push('/chat-history' as never)} hitSlop={12}>
              <MaterialCommunityIcons name="history" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Quick prompts */}
        <View style={styles.promptsRow}>
          {quickPrompts.map((p) => (
            <Pressable
              key={p}
              style={styles.promptChip}
              onPress={() => void handleSend(`I have ${p.toLowerCase()}`)}
            >
              <Text style={styles.promptText}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble item={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingRow}>
            <LottieView
              source={require('../../assets/animations/loading.json')}
              autoPlay
              loop
              style={{ width: 32, height: 32 }}
            />
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { marginBottom: TAB_BAR_HEIGHT }]}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your symptoms..."
            placeholderTextColor={systemColors.gray2}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => void handleSend()}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!inputText.trim() || isTyping}
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || isTyping) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <MaterialCommunityIcons
              name="send"
              size={18}
              color={inputText.trim() && !isTyping ? '#fff' : systemColors.gray3}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    flexWrap: 'wrap',
  },
  promptChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  promptText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '90%',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D6EAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: systemColors.blue,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.onSurface,
  },
  userBubbleText: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: systemColors.gray2,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: systemColors.gray6,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  systemText: {
    fontSize: 12,
    color: systemColors.gray,
    lineHeight: 18,
    flex: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  typingText: {
    fontSize: 12,
    color: systemColors.gray,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: systemColors.gray5,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: theme.colors.onSurface,
    backgroundColor: systemColors.gray6,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: systemColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: systemColors.gray5,
  },
  sendBtnPressed: {
    opacity: 0.7,
  },
});
