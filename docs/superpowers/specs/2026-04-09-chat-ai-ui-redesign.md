# Chat AI UI Redesign — Voice-Assistant Hybrid

**Date**: 2026-04-09
**Scope**: `mobile/src/screens/chat/chat-screen.tsx` (frontend-only, no backend changes)

## Problem

Current chat screen uses a voice-call style layout: large avatar (42% screen), tiny subtitle (60px), no chat history visible, 2 buttons (mic + hangup) too close to bottom tab bar.

## Goal

Redesign to a voice-assistant hybrid: small avatar top-left, full scrollable chat transcript with message bubbles, single mic toggle button, text input bar — all with proper bottom spacing.

## Layout (top to bottom)

### 1. Header
- Keep existing `GradientHeader` with title "Chat AI" and history button
- No changes needed

### 2. Avatar Row (top-left, below header)
- Video avatar shrunk to ~60x60px, circular (`borderRadius: 30`)
- `waiting_avatar.mp4` when state !== `AI_SPEAKING`
- `talking_avatar.mp4` when state === `AI_SPEAKING`
- Row layout: avatar + text column (name "Trợ lý AI" + status indicator)
- Status text: "Đang kết nối..." / "Đang suy nghĩ..." / "Đang nghe..." / "Trực tuyến"
- Padding: `figmaSpacing.md` (16px) horizontal

### 3. Chat Transcript Area (flex: 1, scrollable)
- `FlatList` or `ScrollView` displaying conversation messages
- **AI messages**: bubble on left side, light gray background (`figmaColors.surface`), dark text
  - Small circular AI icon (robot) beside the bubble
- **User messages**: bubble on right side, primary blue background (`figmaColors.primary`), white text
- Each bubble: `borderRadius: figmaRadius.lg` (16px), padding 12px, max-width 75%
- Real-time transcript: when AI is speaking, append/update the latest AI bubble in real-time
- Auto-scroll to bottom on new messages
- Messages sourced from:
  - Current session state (in-memory array of `{ role, content, timestamp }`)
  - Loaded from backend on mount if `sessionId` exists

### 4. Text Input Bar (fixed, above mic button)
- Pill-shaped TextInput + send button (same style as current, refined)
- Background: `figmaColors.surface`, border: `figmaColors.border`
- Height: 48px, horizontal margin: 16px
- Send button: circular, primary color, icon "send"
- Disabled when state !== `IDLE`

### 5. Mic Toggle Button (centered, bottom)
- Single circular button, 64x64px, centered horizontally
- **Mic off (idle)**: `microphone` icon, primary blue background
- **Mic on (listening)**: `microphone-off` icon, red background (`#EF4444`)
- Press to start recording, press again to stop
- Disabled during `CONNECTING` and `PROCESSING` states
- `marginBottom: 24px` minimum to avoid bottom tab bar overlap

### Removed Elements
- Large avatar container (42% height) — replaced by 60x60 top-left
- Subtitle box (60px) — replaced by chat bubbles
- Hangup button — removed entirely
- Status overlay badges — replaced by inline status text next to avatar

## State Management Changes

### New State
- `messages: Array<{ id: string, role: 'user' | 'assistant', content: string, timestamp: Date }>` — in-memory conversation history for the current session
- `isRecording: boolean` — clearer toggle for mic state

### Message Flow
1. **User sends text**: add user bubble → send via WS/REST → receive AI response → add AI bubble
2. **User records voice**: mic toggles to recording → stop → send audio via WS → receive transcript + audio → add user bubble (from inputTranscription) + AI bubble (from outputTranscription)
3. **Real-time**: during AI_SPEAKING, update the latest AI bubble content as transcript streams in
4. **On mount**: if resuming a session, load history from `chatService.getSessionMessages()`

## Visual Style
- Colors: `figmaColors` tokens (primary, surface, textPrimary, textSecondary, border)
- Fonts: `figmaFonts` (Inter)
- Spacing: `figmaSpacing` (8px grid)
- Radii: `figmaRadius`
- Consistent with existing Figma design system

## Files to Modify
- `mobile/src/screens/chat/chat-screen.tsx` — full rewrite of layout and logic

## Files NOT Modified
- Backend (no changes)
- `chat-history-screen.tsx` (no changes)
- Route wrapper `chat.tsx` (no changes)
- Services/stores (no changes)
