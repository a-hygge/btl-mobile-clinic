# Voice Chat AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-only AI chat with real-time voice + text chat using Gemini Live API via WebSocket relay.

**Architecture:** Backend Express server hosts a `ws` WebSocket server at `/ws/voice-chat` that authenticates via JWT, relays audio/text to Gemini Live API, buffers audio response chunks, and sends complete WAV audio back to mobile. Mobile rewrites `chat-screen.tsx` as a voice-first interface with video avatar animations (talking/waiting MP4s), push-to-talk mic, text input, and audio playback.

**Tech Stack:** `ws` (backend WebSocket), Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`), `expo-av` (mobile audio recording/playback), `expo-file-system` (temp file management)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `backend/src/config/env.ts` | Add `GOOGLE_API_KEY` to Zod schema |
| Modify | `backend/.env.example` | Update AI config comments, ensure `GOOGLE_API_KEY` |
| Create | `backend/src/modules/ai/voice-chat.gateway.ts` | WebSocket server, JWT auth, Gemini relay, DB persistence |
| Modify | `backend/src/app.ts` | Create HTTP server, mount WebSocket, import gateway |
| Modify | `backend/src/modules/ai/ai.routes.ts` | Remove `POST /chat` route |
| Rewrite | `mobile/src/screens/chat/chat-screen.tsx` | VoiceChatScreen with avatar, mic, text input, WS client |
| Modify | `mobile/src/services/chat.service.ts` | Remove `sendChatMessage`, keep session history functions |

---

### Task 1: Backend — Install `ws` and update env config

**Files:**
- Modify: `backend/package.json` (install ws)
- Modify: `backend/src/config/env.ts:42` (add GOOGLE_API_KEY)
- Modify: `backend/.env.example:17-20` (update AI section)

- [ ] **Step 1: Install ws package**

```bash
cd backend && npm install ws && npm install -D @types/ws
```

- [ ] **Step 2: Add GOOGLE_API_KEY to env schema**

In `backend/src/config/env.ts`, add after the `GOOGLE_MAPS_API_KEY` line (line 42):

```typescript
  GOOGLE_API_KEY: z.string().default(''),
```

So lines 42-43 become:

```typescript
  GOOGLE_MAPS_API_KEY: z.string().default(''),
  GOOGLE_API_KEY: z.string().default(''),
```

- [ ] **Step 3: Update .env.example AI section**

Replace lines 17-20 in `backend/.env.example`:

```env
# AI Provider (OpenAI-compatible for text chat features)
AI_PROVIDER="openai"
AI_API_KEY="your-api-key"
AI_BASE_URL="https://api.bluesminds.com/v1"
AI_MODEL="gpt-5-mini"
```

with:

```env
# AI Provider (OpenAI-compatible for text features like symptom extraction)
AI_PROVIDER="openai"
AI_API_KEY="your-api-key"
AI_BASE_URL="https://api.bluesminds.com/v1"
AI_MODEL="gpt-5-mini"

# Gemini Live API (voice chat)
# GOOGLE_API_KEY is already defined below — used for both Maps and Gemini Live
```

No need to duplicate `GOOGLE_API_KEY` since it already exists at line 49.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/config/env.ts
cd .. && git add backend/.env.example
cd backend
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "chore(ai): add ws package and GOOGLE_API_KEY env config"
```

---

### Task 2: Backend — Create voice-chat.gateway.ts

**Files:**
- Create: `backend/src/modules/ai/voice-chat.gateway.ts`

- [ ] **Step 1: Create the gateway file**

Create `backend/src/modules/ai/voice-chat.gateway.ts` with this content:

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import type { ChatMessageRole } from '@prisma/client';

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const VOICE_SYSTEM_PROMPT = `Bạn là trợ lý y tế ảo của hệ thống đặt lịch khám bệnh.
- Hỏi làm rõ triệu chứng (tối đa 2-3 câu hỏi)
- Sau khi thu thập thông tin, gợi ý chuyên khoa phù hợp
- Luôn nhắc: đây không phải chẩn đoán y khoa
- Nói ngắn gọn, thân thiện
- Trả lời bằng tiếng Việt`;

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

interface ClientSession {
  userId: string;
  chatSessionId: string;
  geminiWs: WebSocket | null;
  audioChunks: Buffer[];
  inputTranscript: string;
  outputTranscript: string;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
}

// ── WAV helpers ──────────────────────────────────────────────

function stripWavHeader(wavBase64: string): string {
  const buf = Buffer.from(wavBase64, 'base64');
  // Standard WAV header = 44 bytes; verify RIFF magic
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
    return buf.slice(44).toString('base64');
  }
  return wavBase64; // already raw PCM
}

function createWavBuffer(pcmData: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);                     // chunk size
  header.writeUInt16LE(1, 20);                      // PCM format
  header.writeUInt16LE(1, 22);                      // mono
  header.writeUInt32LE(sampleRate, 24);             // sample rate
  header.writeUInt32LE(sampleRate * 2, 28);         // byte rate (16-bit mono)
  header.writeUInt16LE(2, 32);                      // block align
  header.writeUInt16LE(16, 34);                     // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

// ── Gemini message handlers ──────────────────────────────────

function handleGeminiMessage(
  raw: Buffer | string,
  session: ClientSession,
  clientWs: WebSocket,
) {
  let msg: any;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  // Setup complete acknowledgement
  if (msg.setupComplete) {
    return; // already sent "ready" on gemini open + setup send
  }

  const sc = msg.serverContent;
  if (!sc) return;

  // Audio chunks from model turn
  if (sc.modelTurn?.parts) {
    for (const part of sc.modelTurn.parts) {
      if (part.inlineData?.data) {
        session.audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
      }
    }
  }

  // Output transcription (what AI says)
  if (sc.outputTranscription?.text) {
    session.outputTranscript += sc.outputTranscription.text;
    send(clientWs, {
      type: 'transcript_out',
      text: sc.outputTranscription.text,
    });
  }

  // Input transcription (what user said via voice)
  if (sc.inputTranscription?.text) {
    session.inputTranscript += sc.inputTranscription.text;
    send(clientWs, {
      type: 'transcript_in',
      text: sc.inputTranscription.text,
    });
  }

  // Turn complete → flush buffered audio as WAV + persist
  if (sc.turnComplete) {
    if (session.audioChunks.length > 0) {
      const pcm = Buffer.concat(session.audioChunks);
      const wav = createWavBuffer(pcm, 24000);
      send(clientWs, { type: 'audio_response', audio: wav.toString('base64') });
      session.audioChunks = [];
    }
    send(clientWs, { type: 'turn_complete' });
    saveTurnToDb(session).catch(console.error);
  }

  // Interrupted (user barged in)
  if (sc.interrupted) {
    session.audioChunks = [];
    send(clientWs, { type: 'interrupted' });
  }
}

function handleClientMessage(raw: Buffer | string, session: ClientSession) {
  const gws = session.geminiWs;
  if (!gws || gws.readyState !== WebSocket.OPEN) return;

  let msg: any;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (msg.type === 'audio') {
    const pcmBase64 = stripWavHeader(msg.data);
    gws.send(JSON.stringify({
      realtimeInput: {
        audio: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' },
      },
    }));
  } else if (msg.type === 'text') {
    // Persist user text immediately
    prisma.chatMessage
      .create({
        data: {
          sessionId: session.chatSessionId,
          role: 'USER' as ChatMessageRole,
          content: msg.content,
        },
      })
      .catch(console.error);

    gws.send(JSON.stringify({ realtimeInput: { text: msg.content } }));
  }
}

// ── DB persistence ───────────────────────────────────────────

async function saveTurnToDb(session: ClientSession) {
  const rows: { sessionId: string; role: ChatMessageRole; content: string }[] = [];

  if (session.inputTranscript.trim()) {
    rows.push({
      sessionId: session.chatSessionId,
      role: 'USER' as ChatMessageRole,
      content: session.inputTranscript.trim(),
    });
  }
  if (session.outputTranscript.trim()) {
    rows.push({
      sessionId: session.chatSessionId,
      role: 'ASSISTANT' as ChatMessageRole,
      content: session.outputTranscript.trim(),
    });
  }

  if (rows.length) {
    await prisma.chatMessage.createMany({ data: rows });
  }

  session.inputTranscript = '';
  session.outputTranscript = '';
}

// ── Helpers ──────────────────────────────────────────────────

function send(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function resetInactivityTimer(
  session: ClientSession,
  clientWs: WebSocket,
) {
  if (session.inactivityTimer) clearTimeout(session.inactivityTimer);
  session.inactivityTimer = setTimeout(() => {
    console.log(`[voice-chat] session ${session.chatSessionId} timed out`);
    clientWs.close(4000, 'Inactivity timeout');
    session.geminiWs?.close();
  }, INACTIVITY_TIMEOUT_MS);
}

function cleanup(session: ClientSession) {
  if (session.inactivityTimer) clearTimeout(session.inactivityTimer);
  if (session.geminiWs?.readyState === WebSocket.OPEN) {
    session.geminiWs.close();
  }
  session.geminiWs = null;
}

// ── Public setup ─────────────────────────────────────────────

export function setupVoiceChatWs(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/voice-chat' });

  wss.on('connection', async (clientWs, req) => {
    // ── Auth ──
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      clientWs.close(4001, 'Missing token');
      return;
    }

    let userId: string;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch {
      clientWs.close(4001, 'Invalid token');
      return;
    }

    // ── Create DB session ──
    const chatSession = await prisma.chatSession.create({
      data: { userId, title: 'Voice Chat' },
    });

    const session: ClientSession = {
      userId,
      chatSessionId: chatSession.id,
      geminiWs: null,
      audioChunks: [],
      inputTranscript: '',
      outputTranscript: '',
      inactivityTimer: null,
    };

    // ── Connect to Gemini Live API ──
    const geminiUrl = `${GEMINI_WS_URL}?key=${env.GOOGLE_API_KEY}`;
    const geminiWs = new WebSocket(geminiUrl);
    session.geminiWs = geminiWs;

    geminiWs.on('open', () => {
      // Send BidiGenerateContentSetup (must be first message)
      geminiWs.send(JSON.stringify({
        setup: {
          model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: VOICE_SYSTEM_PROMPT }],
          },
          realtimeInputConfig: {
            inputAudioTranscription: {},
          },
          outputAudioTranscription: {},
        },
      }));

      send(clientWs, { type: 'ready', sessionId: chatSession.id });
      resetInactivityTimer(session, clientWs);
    });

    // ── Gemini → Client ──
    geminiWs.on('message', (data) => {
      handleGeminiMessage(data as Buffer, session, clientWs);
    });

    // ── Client → Gemini ──
    clientWs.on('message', (data) => {
      handleClientMessage(data as Buffer, session);
      resetInactivityTimer(session, clientWs);
    });

    // ── Cleanup ──
    clientWs.on('close', () => cleanup(session));
    geminiWs.on('close', () => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    });
    geminiWs.on('error', (err) => {
      console.error('[voice-chat] Gemini WS error:', err.message);
      send(clientWs, { type: 'error', message: 'Lỗi kết nối AI' });
    });
    clientWs.on('error', (err) => {
      console.error('[voice-chat] Client WS error:', err.message);
      cleanup(session);
    });
  });

  console.log('[voice-chat] WebSocket server ready at /ws/voice-chat');
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors (or only pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/voice-chat.gateway.ts
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "feat(ai): add voice chat WebSocket gateway with Gemini Live API relay"
```

---

### Task 3: Backend — Mount WebSocket server in app.ts

**Files:**
- Modify: `backend/src/app.ts:1-2` (add http import), `backend/src/app.ts:57-68` (wrap listen with http.createServer)

- [ ] **Step 1: Add imports at top of app.ts**

After line 1 (`import express from 'express';`), add:

```typescript
import { createServer } from 'http';
```

After line 14 (`import { aiRoutes } from './modules/ai/ai.routes';`), add:

```typescript
import { setupVoiceChatWs } from './modules/ai/voice-chat.gateway';
```

- [ ] **Step 2: Replace app.listen with http.createServer**

Replace the `main()` function (lines 58-73) with:

```typescript
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    NotificationScheduler.start();

    const httpServer = createServer(app);
    setupVoiceChatWs(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

The key change: `app.listen(...)` → `createServer(app)` + `httpServer.listen(...)`. This gives us the raw HTTP server reference needed by `ws`.

- [ ] **Step 3: Verify it compiles and starts**

```bash
cd backend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app.ts
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "feat(ai): mount voice chat WebSocket on HTTP server"
```

---

### Task 4: Backend — Remove POST /ai/chat route

**Files:**
- Modify: `backend/src/modules/ai/ai.routes.ts:8`

- [ ] **Step 1: Remove the chat POST route**

In `backend/src/modules/ai/ai.routes.ts`, delete the line:

```typescript
aiRoutes.post('/chat', AiController.sendMessage);
```

Keep all other routes (GET sessions, GET session messages, POST symptoms, GET health-tips).

- [ ] **Step 2: Remove unused imports in controller**

In `backend/src/modules/ai/ai.controller.ts`, the `sendMessage` method and its schema import can stay (dead code is harmless and keeps history API intact if needed). But remove the `sendMessageSchema` import from controller if you want cleanliness:

Actually, leave it — the method might be useful for fallback. Just remove the route.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/ai.routes.ts
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "refactor(ai): remove POST /chat route, replaced by WebSocket voice chat"
```

---

### Task 5: Mobile — Install expo-av and expo-file-system

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install packages**

```bash
cd mobile && npx expo install expo-av expo-file-system
```

`expo-av` for audio recording + playback. `expo-file-system` for writing temp WAV files.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "chore(chat): add expo-av and expo-file-system for voice chat"
```

---

### Task 6: Mobile — Rewrite chat-screen.tsx as VoiceChatScreen

**Files:**
- Rewrite: `mobile/src/screens/chat/chat-screen.tsx`

This is a full rewrite. The file currently exports `ChatScreen` — we replace it with `VoiceChatScreen` (still exported as `ChatScreen` to keep the tab route working without changes).

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `mobile/src/screens/chat/chat-screen.tsx` with:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { GradientHeader } from '../../components/shared/GradientHeader';
import {
  figmaColors,
  figmaFonts,
  figmaSpacing,
  figmaRadius,
} from '../../constants/theme';

// Assets — MP4 avatar animations
const TALKING_VIDEO = require('../../../asset/talking_avatar.mp4');
const WAITING_VIDEO = require('../../../asset/waiting_avatar.mp4');

// Derive WS URL from API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const WS_URL = API_URL.replace(/^http/, 'ws').replace('/api/v1', '') + '/ws/voice-chat';

type VoiceState = 'CONNECTING' | 'IDLE' | 'LISTENING' | 'PROCESSING' | 'AI_SPEAKING';

// Recording config: WAV PCM 16kHz mono (iOS guaranteed, Android best-effort)
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

/**
 * Voice-first AI chat screen.
 * Exported as ChatScreen to keep tab route unchanged.
 */
export function ChatScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [state, setState] = useState<VoiceState>('CONNECTING');
  const [subtitle, setSubtitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const turnCompleteRef = useRef(false);

  // ── WebSocket lifecycle ──────────────────────────────────

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);

      switch (msg.type) {
        case 'ready':
          setSessionId(msg.sessionId);
          setState('IDLE');
          setSubtitle('Xin chào! Tôi có thể giúp gì cho bạn?');
          break;

        case 'transcript_out':
          setSubtitle((prev) => prev + msg.text);
          break;

        case 'transcript_in':
          // Could display user transcription — skip for now
          break;

        case 'audio_response':
          setState('AI_SPEAKING');
          playAudio(msg.audio);
          break;

        case 'turn_complete':
          turnCompleteRef.current = true;
          // If sound is not playing (e.g. text-only response), go idle
          if (!soundRef.current) {
            setState('IDLE');
          }
          break;

        case 'interrupted':
          stopPlayback();
          setState('IDLE');
          setSubtitle('');
          break;

        case 'error':
          console.warn('[VoiceChat] Server error:', msg.message);
          setState('IDLE');
          break;
      }
    };

    ws.onclose = () => {
      setState('CONNECTING');
    };

    ws.onerror = (err) => {
      console.error('[VoiceChat] WS error:', err);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  // ── Audio playback ───────────────────────────────────────

  const playAudio = async (wavBase64: string) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const fileUri = `${FileSystem.cacheDirectory}ai_response_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setState('IDLE');
          // Keep subtitle visible briefly then clear
          setTimeout(() => setSubtitle(''), 3000);
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error('[VoiceChat] Playback error:', err);
      soundRef.current = null;
      setState('IDLE');
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { /* ignore */ }
      soundRef.current = null;
    }
  };

  // ── Audio recording (push-to-talk) ──────────────────────

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setState('LISTENING');
    } catch (err) {
      console.error('[VoiceChat] Recording start error:', err);
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
        setState('PROCESSING');
        setSubtitle('');
        turnCompleteRef.current = false;
      } else {
        setState('IDLE');
      }
    } catch (err) {
      console.error('[VoiceChat] Recording stop error:', err);
      setState('IDLE');
    }
  };

  // ── Mic toggle ──────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (state === 'LISTENING') {
      stopRecording();
    } else if (state === 'IDLE') {
      startRecording();
    } else if (state === 'AI_SPEAKING') {
      // Interrupt AI and start listening
      stopPlayback();
      startRecording();
    }
  }, [state]);

  // ── Send text ───────────────────────────────────────────

  const sendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || state !== 'IDLE') return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', content: text }));
      setTextInput('');
      setState('PROCESSING');
      setSubtitle('');
      turnCompleteRef.current = false;
    }
  }, [textInput, state]);

  // ── End session ─────────────────────────────────────────

  const endSession = useCallback(() => {
    wsRef.current?.close();
    router.back();
  }, []);

  // ── Derived state ───────────────────────────────────────

  const isTalking = state === 'AI_SPEAKING';
  const micDisabled = state === 'CONNECTING' || state === 'PROCESSING';

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Chat AI"
        showBack
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/chat-history')}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="history" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Video Avatar */}
        <View style={styles.avatarContainer}>
          <Video
            source={isTalking ? TALKING_VIDEO : WAITING_VIDEO}
            style={styles.avatar}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay
          />
          {state === 'CONNECTING' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Đang kết nối...</Text>
            </View>
          )}
          {state === 'PROCESSING' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI đang suy nghĩ...</Text>
            </View>
          )}
          {state === 'LISTENING' && (
            <View style={[styles.badge, styles.badgeRed]}>
              <Text style={styles.badgeText}>Đang nghe...</Text>
            </View>
          )}
        </View>

        {/* Subtitle */}
        {subtitle ? (
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitleText} numberOfLines={3}>
              {subtitle}
            </Text>
          </View>
        ) : (
          <View style={styles.subtitleBox} />
        )}

        {/* Text input */}
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

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.micBtn, state === 'LISTENING' && styles.micBtnActive]}
            onPress={toggleMic}
            disabled={micDisabled}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={state === 'LISTENING' ? 'stop' : 'microphone'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endBtn}
            onPress={endSession}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="phone-hangup" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: figmaColors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },

  // Avatar
  avatarContainer: {
    width: width * 0.85,
    height: height * 0.42,
    borderRadius: figmaRadius.xl,
    overflow: 'hidden',
    marginTop: figmaSpacing.xl,
    backgroundColor: '#000',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: figmaFonts.sizes.lg,
    fontWeight: figmaFonts.weights.semibold,
  },
  badge: {
    position: 'absolute',
    bottom: figmaSpacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: figmaSpacing.lg,
    paddingVertical: figmaSpacing.sm,
    borderRadius: figmaRadius.pill,
  },
  badgeRed: {
    backgroundColor: 'rgba(239,68,68,0.8)',
  },
  badgeText: {
    color: '#fff',
    fontSize: figmaFonts.sizes.base,
    fontWeight: figmaFonts.weights.medium,
  },

  // Subtitle
  subtitleBox: {
    minHeight: 60,
    paddingHorizontal: figmaSpacing['2xl'],
    justifyContent: 'center',
  },
  subtitleText: {
    fontSize: figmaFonts.sizes.lg,
    color: figmaColors.textPrimary,
    textAlign: 'center',
    lineHeight: figmaFonts.sizes.lg * figmaFonts.lineHeights.relaxed,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: figmaSpacing.xl,
    gap: figmaSpacing.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: figmaColors.surface,
    borderRadius: figmaRadius.pill,
    paddingHorizontal: figmaSpacing.xl,
    fontSize: figmaFonts.sizes.md,
    color: figmaColors.textPrimary,
    borderWidth: 1,
    borderColor: figmaColors.border,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: figmaColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: figmaSpacing['2xl'],
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: figmaColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
  endBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/chat/chat-screen.tsx
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "feat(chat): rewrite chat screen as voice-first AI with Gemini Live API"
```

---

### Task 7: Mobile — Clean up chat.service.ts

**Files:**
- Modify: `mobile/src/services/chat.service.ts`

- [ ] **Step 1: Remove sendChatMessage function**

Delete the `sendChatMessage` function and its `SendMessageResponse` type from `chat.service.ts`. Keep:
- `getChatSessions()` — used by ChatHistoryScreen
- `getSessionMessages()` — used by ChatHistoryScreen
- `extractSymptoms()` — used by booking flow
- All types needed by the above

Remove `SendMessageResponse` interface and the `sendChatMessage` function.

- [ ] **Step 2: Commit**

```bash
git add src/services/chat.service.ts
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "refactor(chat): remove sendChatMessage, replaced by WebSocket voice chat"
```

---

### Task 8: Manual end-to-end test

- [ ] **Step 1: Start backend**

```bash
cd backend && npm run dev
```

Verify log: `[voice-chat] WebSocket server ready at /ws/voice-chat`

- [ ] **Step 2: Test WebSocket connection**

Use `wscat` or browser console to test:

```bash
npx wscat -c "ws://localhost:3000/ws/voice-chat?token=<valid-jwt>"
```

Expected: receive `{"type":"ready","sessionId":"<uuid>"}`

- [ ] **Step 3: Test text input**

In the wscat session, send:

```json
{"type":"text","content":"Tôi bị đau đầu"}
```

Expected: receive `transcript_out` messages, then `audio_response` (base64 WAV), then `turn_complete`.

- [ ] **Step 4: Start mobile and test UI**

```bash
cd mobile && npx expo start
```

- Open app → login as patient (`patient1@gmail.com` / `password123`)
- Navigate to "Chat AI" tab
- Verify: video avatar shows `waiting_avatar.mp4`, subtitle shows greeting
- Type text message → send → avatar switches to talking when audio plays
- Tap mic → record → tap again → stop → wait for AI voice response
- Tap end button → returns to previous screen
- Check history icon → shows voice chat sessions

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git -c user.name="c0ncobebe1" -c user.email="trungkiennguyen7878@gmail.com" commit -m "fix(chat): adjustments from e2e voice chat testing"
```
