# Chat AI UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the AI chat screen from voice-call layout to voice-assistant hybrid with small avatar, scrollable chat transcript, and single mic toggle button.

**Architecture:** Single-file rewrite of `chat-screen.tsx`. Add `messages` state array to track conversation. Replace large avatar + subtitle + 2 buttons with: avatar row (top-left), FlatList chat bubbles (middle), text input + mic button (bottom). No backend changes.

**Tech Stack:** React Native, expo-video, expo-av, expo-file-system, WebSocket, Figma design tokens

---

### Task 1: Rewrite ChatScreen layout and state

**Files:**
- Modify: `mobile/src/screens/chat/chat-screen.tsx` (full rewrite of JSX, styles, and state)

- [ ] **Step 1: Add messages state and types**

Add a `ChatMessage` type and `messages` state array at the top of the component, plus a `flatListRef` for auto-scrolling:

```typescript
interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Inside ChatScreen():
const [messages, setMessages] = useState<ChatBubble[]>([]);
const flatListRef = useRef<FlatList>(null);
```

Also add `FlatList` and `KeyboardAvoidingView` to the React Native imports.

- [ ] **Step 2: Update WebSocket message handlers to populate messages**

Modify `ws.onmessage` handler:

- `case 'ready'`: Add welcome message to `messages`:
  ```typescript
  case 'ready':
    setSessionId(msg.sessionId);
    setState('IDLE');
    setMessages([{
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      timestamp: new Date(),
    }]);
    break;
  ```

- `case 'transcript_in'`: Add user transcript to messages:
  ```typescript
  case 'transcript_in':
    if (msg.text?.trim()) {
      setMessages(prev => {
        const existing = prev.find(m => m.id === 'user-pending');
        if (existing) {
          return prev.map(m => m.id === 'user-pending'
            ? { ...m, content: m.content + msg.text }
            : m
          );
        }
        return [...prev, {
          id: 'user-pending',
          role: 'user',
          content: msg.text,
          timestamp: new Date(),
        }];
      });
    }
    break;
  ```

- `case 'transcript_out'`: Append to streaming AI bubble:
  ```typescript
  case 'transcript_out':
    setMessages(prev => {
      const existing = prev.find(m => m.id === 'ai-streaming');
      if (existing) {
        return prev.map(m => m.id === 'ai-streaming'
          ? { ...m, content: m.content + msg.text }
          : m
        );
      }
      return [...prev, {
        id: 'ai-streaming',
        role: 'assistant',
        content: msg.text,
        timestamp: new Date(),
      }];
    });
    break;
  ```

- `case 'audio_response'`: Keep playback logic, but also start streaming bubble:
  ```typescript
  case 'audio_response':
    playingRef.current = true;
    setState('AI_SPEAKING');
    playAudio(msg.audio);
    break;
  ```

- `case 'turn_complete'`: Finalize pending message IDs:
  ```typescript
  case 'turn_complete':
    setMessages(prev => prev.map(m => {
      if (m.id === 'user-pending') return { ...m, id: `user-${Date.now()}` };
      if (m.id === 'ai-streaming') return { ...m, id: `ai-${Date.now()}` };
      return m;
    }));
    if (!playingRef.current) setState('IDLE');
    break;
  ```

- `case 'interrupted'`: Finalize streaming messages:
  ```typescript
  case 'interrupted':
    stopPlayback();
    setState('IDLE');
    setMessages(prev => prev.map(m => {
      if (m.id === 'ai-streaming') return { ...m, id: `ai-${Date.now()}` };
      return m;
    }));
    break;
  ```

- [ ] **Step 3: Update sendText to add user bubble**

In `sendText`, add user message to `messages` before sending:

```typescript
const sendText = useCallback(async () => {
  const text = textInput.trim();
  if (!text || state !== 'IDLE') return;

  const userMsg: ChatBubble = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: new Date(),
  };
  setMessages(prev => [...prev, userMsg]);
  setTextInput('');
  setState('PROCESSING');

  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ type: 'text', content: text }));
    return;
  }

  // REST fallback
  try {
    const baseUrl = API_URL.includes('/api/v1') ? API_URL : `${API_URL}/api/v1`;
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });
    const json = await res.json();
    const reply = json?.data?.aiMessage?.content ?? json?.data?.reply ?? 'Không có phản hồi.';
    setMessages(prev => [...prev, {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    }]);
    setState('IDLE');
  } catch (err) {
    console.error('[Chat] REST fallback error:', err);
    setMessages(prev => [...prev, {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: 'Không thể gửi tin nhắn. Vui lòng thử lại.',
      timestamp: new Date(),
    }]);
    setState('IDLE');
  }
}, [textInput, state, token]);
```

- [ ] **Step 4: Rewrite JSX layout**

Replace the entire `return (...)` block with the new layout:

```tsx
const statusText = state === 'CONNECTING' ? 'Đang kết nối...'
  : state === 'PROCESSING' ? 'Đang suy nghĩ...'
  : state === 'LISTENING' ? 'Đang nghe...'
  : state === 'AI_SPEAKING' ? 'Đang trả lời...'
  : 'Trực tuyến';

return (
  <View style={styles.container}>
    <GradientHeader
      title="Chat AI"
      showBack
      rightSlot={
        <TouchableOpacity onPress={() => router.push('/chat-history')} hitSlop={12}>
          <MaterialCommunityIcons name="history" size={24} color="#fff" />
        </TouchableOpacity>
      }
    />

    <KeyboardAvoidingView
      style={styles.content}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Avatar Row */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarSmall}>
          {VideoView && player ? (
            <VideoView
              player={player}
              style={styles.avatarVideo}
              nativeControls={false}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarVideo, styles.avatarFallback]}>
              <MaterialCommunityIcons
                name={isTalking ? 'account-voice' : 'robot-outline'}
                size={28}
                color={figmaColors.primary}
              />
            </View>
          )}
        </View>
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName}>Trợ lý AI</Text>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: state === 'CONNECTING' ? figmaColors.warning
                : state === 'LISTENING' ? '#EF4444'
                : figmaColors.success },
            ]} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[
            styles.bubbleRow,
            item.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowAI,
          ]}>
            {item.role === 'assistant' && (
              <View style={styles.bubbleAvatar}>
                <MaterialCommunityIcons name="robot" size={16} color={figmaColors.primary} />
              </View>
            )}
            <View style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
            ]}>
              <Text style={[
                styles.bubbleText,
                item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI,
              ]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Text Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={figmaColors.textMuted}
          value={textInput}
          onChangeText={setTextInput}
          onSubmitEditing={sendText}
          editable={state === 'IDLE'}
          returnKeyType="send"
        />
        {textInput.trim() ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={sendText}
            disabled={state !== 'IDLE'}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Mic Toggle */}
      <TouchableOpacity
        style={[styles.micBtn, state === 'LISTENING' && styles.micBtnActive]}
        onPress={toggleMic}
        disabled={micDisabled}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={state === 'LISTENING' ? 'microphone-off' : 'microphone'}
          size={28}
          color="#fff"
        />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  </View>
);
```

- [ ] **Step 5: Replace StyleSheet with new styles**

Delete all existing styles and replace with:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: figmaColors.background,
  },
  content: {
    flex: 1,
  },

  // Avatar Row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: figmaSpacing.lg,
    paddingVertical: figmaSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: figmaColors.border,
    backgroundColor: figmaColors.surface,
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: figmaColors.pastelBlue,
  },
  avatarVideo: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: figmaColors.pastelBlue,
  },
  avatarInfo: {
    marginLeft: figmaSpacing.md,
    flex: 1,
  },
  avatarName: {
    fontSize: figmaFonts.sizes.lg,
    fontWeight: figmaFonts.weights.semibold,
    color: figmaColors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: figmaSpacing.xs,
  },
  statusText: {
    fontSize: figmaFonts.sizes.sm,
    color: figmaColors.textSecondary,
  },

  // Message List
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: figmaSpacing.lg,
    paddingVertical: figmaSpacing.sm,
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: figmaSpacing.sm,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: figmaColors.pastelBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: figmaSpacing.sm,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: figmaSpacing.lg,
    paddingVertical: figmaSpacing.md,
    borderRadius: figmaRadius.lg,
  },
  bubbleUser: {
    backgroundColor: figmaColors.primary,
    borderBottomRightRadius: figmaSpacing.xs,
  },
  bubbleAI: {
    backgroundColor: figmaColors.surface,
    borderBottomLeftRadius: figmaSpacing.xs,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  bubbleText: {
    fontSize: figmaFonts.sizes.md,
    lineHeight: figmaFonts.sizes.md * figmaFonts.lineHeights.relaxed,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAI: {
    color: figmaColors.textPrimary,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: figmaSpacing.lg,
    paddingTop: figmaSpacing.sm,
    gap: figmaSpacing.sm,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: figmaColors.surface,
    borderRadius: figmaRadius.pill,
    paddingHorizontal: figmaSpacing.xl,
    fontSize: figmaFonts.sizes.md,
    color: figmaColors.textPrimary,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: figmaColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mic
  micBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: figmaColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: figmaSpacing.md,
    marginBottom: figmaSpacing['2xl'],
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
});
```

- [ ] **Step 6: Remove dead code**

Remove these no longer needed items:
- `endSession` callback (hangup button removed)
- `subtitle` and `setSubtitle` state (replaced by messages)
- All old `setSubtitle()` calls throughout — replace with `setMessages()` appends where appropriate (error messages in `startRecording`, `stopRecording`, `ws.onerror`)
- Old `Dimensions` import if no longer used (width, height constants)

For error states that used `setSubtitle`, add system messages to chat:

```typescript
// In stopRecording catch:
setMessages(prev => [...prev, {
  id: `ai-${Date.now()}`,
  role: 'assistant',
  content: 'Không thể ghi âm. Vui lòng nhập tin nhắn bằng văn bản.',
  timestamp: new Date(),
}]);

// In ws.onerror:
setMessages(prev => [...prev, {
  id: `ai-${Date.now()}`,
  role: 'assistant',
  content: 'Kết nối voice không thành công. Bạn có thể nhập tin nhắn bằng văn bản.',
  timestamp: new Date(),
}]);

// In 5s timeout fallback:
setMessages(prev => [...prev, {
  id: `ai-${Date.now()}`,
  role: 'assistant',
  content: 'Đang chờ kết nối voice... Bạn có thể nhập tin nhắn.',
  timestamp: new Date(),
}]);
```

- [ ] **Step 7: Load session history on mount**

After receiving the `ready` message with `sessionId`, load existing messages if any:

```typescript
// Add import at top:
import { getSessionMessages, ChatMessageItem } from '../../services/chat.service';

// In 'ready' case, after setting sessionId:
case 'ready':
  setSessionId(msg.sessionId);
  setState('IDLE');
  // Load existing messages for this session
  getSessionMessages(msg.sessionId).then(data => {
    if (data.messages.length > 0) {
      setMessages(data.messages.map((m: ChatMessageItem) => ({
        id: m.id,
        role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: m.content,
        timestamp: new Date(m.createdAt),
      })));
    } else {
      setMessages([{
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: 'Xin chào! Tôi có thể giúp gì cho bạn?',
        timestamp: new Date(),
      }]);
    }
  }).catch(() => {
    setMessages([{
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: 'Xin chào! Tôi có thể giúp gì cho bạn?',
      timestamp: new Date(),
    }]);
  });
  break;
```

- [ ] **Step 8: Verify the app compiles**

Run: `cd /home/sonktx/btl-mobile/mobile && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors related to chat-screen.tsx

- [ ] **Step 9: Commit**

```bash
git add mobile/src/screens/chat/chat-screen.tsx
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "feat(chat): redesign AI chat screen — small avatar, chat bubbles, single mic toggle"
```

(Committed as Kien since chat screen is in `mobile/src/screens/chat/`)
