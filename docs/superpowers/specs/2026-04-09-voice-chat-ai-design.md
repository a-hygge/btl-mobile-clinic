# Voice Chat AI — Design Spec

**Date:** 2026-04-09
**Owner:** Kien (c0ncobebe1) — AI/Chat module
**Status:** Approved

## Overview

Replace the existing text-only AI chat with a voice-first real-time chat using Gemini Live API (`gemini-2.5-flash-native-audio-preview-12-2025`). Users can input via voice (mic) or text, but AI output is always streaming audio with text transcription as subtitles.

## Architecture

```
Mobile (Expo) ←WebSocket→ Backend (Express + ws) ←WebSocket→ Gemini Live API
```

- **Backend WebSocket Relay**: Backend acts as proxy between mobile and Gemini Live API
- **API key stays on server**: Mobile never touches Gemini API key
- **JWT auth on connect**: WebSocket connection requires valid JWT token
- **DB persistence**: Transcriptions saved to existing ChatSession/ChatMessage tables

### Connection Flow

1. Mobile connects: `ws://host:3000/ws/voice-chat?token=<JWT>`
2. Backend verifies JWT → extracts userId
3. Backend creates new ChatSession in DB
4. Backend opens WebSocket to Gemini Live API with config:
   - Model: `models/gemini-2.5-flash-native-audio-preview-12-2025`
   - responseModalities: `["AUDIO"]`
   - systemInstruction: Medical triage assistant prompt (Vietnamese)
   - speechConfig: voice "Kore"
   - inputAudioTranscription + outputAudioTranscription enabled
5. Backend sends `{type: "ready", sessionId: "..."}` to mobile

## Message Protocol (Mobile ↔ Backend)

### Mobile → Backend
```typescript
{ type: "text", content: string }     // user types text
{ type: "audio", data: string }       // base64 PCM16 16kHz chunk
{ type: "audio_end" }                 // user stops speaking
```

### Backend → Mobile
```typescript
{ type: "ready", sessionId: string }      // session ready
{ type: "audio", data: string }           // base64 PCM16 24kHz audio chunk from Gemini
{ type: "transcript_in", text: string }   // what user said (input transcription)
{ type: "transcript_out", text: string }  // what AI said (output transcription)
{ type: "turn_complete" }                 // AI finished speaking
{ type: "interrupted" }                   // user interrupted AI
{ type: "error", message: string }        // error
```

## Backend Implementation

### New Files
- `backend/src/modules/ai/voice-chat.gateway.ts` — WebSocket server, Gemini relay, session management

### Changes to Existing
- `backend/src/index.ts` (or server setup) — mount WS server on HTTP server at `/ws/voice-chat`
- `backend/.env.example` — add `GEMINI_API_KEY` (or reuse `GOOGLE_API_KEY`)

### WebSocket Server
- Library: `ws`
- Mount on existing Express HTTP server at path `/ws/voice-chat`
- Parse JWT from `?token=` query param on upgrade
- One Gemini WS connection per client connection

### Gemini Live API Connection
- URL: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=<GOOGLE_API_KEY>`
- Setup message (first message after connect):
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Kore" }
        }
      }
    },
    "systemInstruction": {
      "parts": [{ "text": "Vietnamese medical triage assistant prompt..." }]
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {}
  }
}
```

### Relay Logic
- Mobile audio → forward as `{ "realtimeInput": { "audio": { "data": base64, "mimeType": "audio/pcm;rate=16000" } } }`
- Mobile text → forward as `{ "realtimeInput": { "text": "..." } }`
- Gemini `serverContent.modelTurn.parts[].inlineData.data` → relay as `{type: "audio", data: base64}`
- Gemini `serverContent.outputTranscription.text` → relay as `{type: "transcript_out", text}`
- Gemini `serverContent.inputTranscription.text` → relay as `{type: "transcript_in", text}`
- Gemini `serverContent.turnComplete` → relay as `{type: "turn_complete"}` + save messages to DB

### DB Persistence
- On `turnComplete`: save accumulated transcriptions as ChatMessage pairs (USER + ASSISTANT)
- On text input: save immediately as ChatMessage(role: USER)
- On disconnect: close Gemini WS, optionally generate session title

### Cleanup
- Client disconnect → close Gemini connection
- 5 min inactivity timeout → auto-close both connections

## Mobile Implementation

### UI: VoiceChatScreen (replaces ChatScreen)

Voice-first layout (like a phone call with AI):

```
┌──────────────────────────────┐
│  ← (back)     Chat AI  (📋) │  GradientHeader (history icon)
│                              │
│    ┌──────────────────┐      │
│    │   Video Avatar   │      │  talking_avatar.mp4 or waiting_avatar.mp4
│    │   (~60% screen)  │      │  loop, switch based on AI state
│    └──────────────────┘      │
│                              │
│    "Subtitle text here"      │  outputTranscription, max 2 lines
│                              │
│  ┌────────────────────────┐  │
│  │  Nhap tin nhan...      │  │  pill-shaped TextInput
│  └────────────────────────┘  │
│      [Mic]      [Stop]      │  toggle mic + end session
└──────────────────────────────┘
```

### State Machine

```
CONNECTING → WAITING ↔ LISTENING → AI_SPEAKING → WAITING
```

| State | Avatar | Mic | Behavior |
|-------|--------|-----|----------|
| CONNECTING | waiting + overlay | disabled | Connecting WebSocket |
| WAITING | waiting_avatar.mp4 | enabled, idle | AI waiting for input |
| LISTENING | waiting_avatar.mp4 | pulsing red | Recording, sending PCM chunks |
| AI_SPEAKING | talking_avatar.mp4 | tap = interrupt | Playing audio + subtitle |

### Audio Recording
- Package: `expo-av`
- Config: PCM16, 16kHz, mono
- Streaming: every ~100ms read buffer → base64 → send via WS
- Push-to-talk: tap mic to start, tap again to stop

### Audio Playback
- Receive base64 PCM chunks → decode → queue into playback buffer
- Use `expo-av` Audio.Sound for continuous playback
- On `turn_complete` → flush buffer → state = WAITING

### Text Input
- Type text + send → WS `{type: "text", content: "..."}`
- State → WAITING → wait for AI audio response
- Only outputTranscription shown as subtitle

### Navigation
- Tab "Chat AI" for PATIENT → VoiceChatScreen (replaces ChatScreen)
- ChatHistoryScreen remains — accessible via history icon on header
- File: rewrite `chat-screen.tsx` entirely

### New Packages Required
- `expo-av` — audio recording + playback

### Assets Used
- `mobile/asset/talking_avatar.mp4` — AI speaking state
- `mobile/asset/waiting_avatar.mp4` — AI waiting/listening state

## Existing REST Endpoints (Kept)
- `GET /api/v1/ai/chat/sessions` — list past sessions (for history screen)
- `GET /api/v1/ai/chat/sessions/:id` — get session messages
- `POST /api/v1/ai/chat` — **removed** (replaced by WebSocket)
- `POST /api/v1/ai/symptoms` — kept (separate feature)
- `GET /api/v1/ai/health-tips` — kept (separate feature)

## Environment
- `GOOGLE_API_KEY` in `.env` — already exists, used for Gemini Live API connection
