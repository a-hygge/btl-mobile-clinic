import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import {
  figmaColors,
  figmaFonts,
  figmaRadius,
  figmaSpacing,
} from '../../constants/theme';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import {
  sendChatMessage,
  getSessionMessages,
  type ChatMessageItem,
} from '../../services/chat.service';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

const DISCLAIMER_TEXT =
  'Tôi là trợ lý AI sức khỏe. Tôi có thể hỗ trợ đánh giá triệu chứng và gợi ý chuyên khoa. Đây không phải chẩn đoán y khoa.';

const QUICK_PROMPTS = ['Đau đầu', 'Đau bụng', 'Sốt', 'Đau lưng', 'Ho'] as const;

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
  let label = 'vừa xong';
  if (diff >= 1 && diff < 60) label = `${diff} phút trước`;
  else if (diff >= 60 && diff < 1440) label = `${Math.floor(diff / 60)} giờ trước`;
  else if (diff >= 1440) label = date.toLocaleDateString('vi-VN');
  return <Text style={styles.time}>{label}</Text>;
}

function ChatBubble({ item }: { item: Message }) {
  if (item.isSystem) {
    return (
      <View style={styles.systemBubble}>
        <MaterialCommunityIcons
          name="information-outline"
          size={14}
          color={figmaColors.textSecondary}
        />
        <Text style={styles.systemText}>{item.text}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bubbleRow,
        item.isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      {!item.isUser && (
        <View style={styles.aiAvatar}>
          <MaterialCommunityIcons
            name="robot-happy-outline"
            size={16}
            color={figmaColors.primary}
          />
        </View>
      )}
      <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, item.isUser && styles.userBubbleText]}>
          {item.text}
        </Text>
        <RelativeTime date={item.createdAt} />
      </View>
    </View>
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
      text: DISCLAIMER_TEXT,
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

  const handleSend = useCallback(
    async (text?: string) => {
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
            text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
            isUser: false,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
        scrollToEnd();
      }
    },
    [inputText, sessionId, isTyping]
  );

  const handleNewChat = useCallback(() => {
    setSessionId(undefined);
    setInputText('');
    setMessages([
      {
        id: 'disclaimer',
        text: DISCLAIMER_TEXT,
        isUser: false,
        isSystem: true,
        createdAt: new Date(),
      },
    ]);
  }, []);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[figmaColors.primary, figmaColors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons
                  name="robot-happy-outline"
                  size={20}
                  color="#fff"
                />
              </View>
              <View>
                <Text variant="titleMedium" style={styles.headerTitle}>
                  Trợ lý AI
                </Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Đang hoạt động</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleNewChat}
                hitSlop={12}
                accessibilityLabel="Cuộc hội thoại mới"
              >
                <MaterialCommunityIcons
                  name="chat-plus-outline"
                  size={20}
                  color="#fff"
                />
              </Pressable>
              <Pressable
                onPress={() => router.push('/chat-history' as never)}
                hitSlop={12}
                accessibilityLabel="Lịch sử"
              >
                <MaterialCommunityIcons name="history" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Quick prompts */}
          <View style={styles.promptsRow}>
            {QUICK_PROMPTS.map((p) => (
              <Pressable
                key={p}
                style={styles.promptChip}
                onPress={() => void handleSend(`Tôi bị ${p.toLowerCase()}`)}
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
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
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
              <Text style={styles.typingText}>AI đang suy nghĩ...</Text>
            </View>
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { marginBottom: TAB_BAR_HEIGHT }]}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mô tả triệu chứng của bạn..."
              placeholderTextColor={figmaColors.textMuted}
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
                color={inputText.trim() && !isTyping ? '#fff' : figmaColors.textMuted}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: figmaSpacing.md,
    paddingHorizontal: figmaSpacing.lg,
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
    fontSize: figmaFonts.sizes.lg,
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
    backgroundColor: figmaColors.success,
  },
  onlineText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: figmaFonts.sizes.xs,
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
    borderRadius: figmaRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  promptText: {
    color: '#fff',
    fontSize: figmaFonts.sizes.base,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    padding: figmaSpacing.lg,
    paddingBottom: figmaSpacing['2xl'],
    gap: figmaSpacing.sm,
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
    backgroundColor: figmaColors.pastelBlue,
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
    backgroundColor: figmaColors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: figmaColors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: figmaFonts.sizes.md,
    lineHeight: 21,
    color: figmaColors.textPrimary,
  },
  userBubbleText: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: figmaColors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: figmaColors.surfaceMuted,
    padding: figmaSpacing.md,
    borderRadius: figmaRadius.md,
    marginHorizontal: figmaSpacing.sm,
    marginBottom: 4,
  },
  systemText: {
    fontSize: figmaFonts.sizes.sm,
    color: figmaColors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: figmaSpacing.lg,
    gap: 4,
  },
  typingText: {
    fontSize: figmaFonts.sizes.sm,
    color: figmaColors.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: figmaSpacing.md,
    paddingVertical: figmaSpacing.sm,
    backgroundColor: figmaColors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: figmaColors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: figmaFonts.sizes.md,
    lineHeight: 20,
    color: figmaColors.textPrimary,
    backgroundColor: figmaColors.surfaceMuted,
    borderRadius: 22,
    paddingHorizontal: figmaSpacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: figmaColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: figmaColors.border,
  },
  sendBtnPressed: {
    opacity: 0.7,
  },
});
