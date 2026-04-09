# Trò chuyện AI bằng giọng nói (Voice Chat AI)

## Tổng quan

Tính năng cho phép bệnh nhân trò chuyện với trợ lý y tế AI bằng **giọng nói** hoặc **văn bản**. AI luôn trả lời bằng giọng nói kèm phụ đề, tạo trải nghiệm như đang gọi điện thoại với bác sĩ ảo.

**Model AI:** Gemini 2.5 Flash Native Audio (`gemini-2.5-flash-native-audio-preview-12-2025`)

**Giao thức:** WebSocket thời gian thực (không dùng REST API)

---

## Kiến trúc

```
┌─────────────────┐        WebSocket         ┌─────────────────┐        WebSocket         ┌─────────────────┐
│                 │  ws://host:3000           │                 │  wss://gemini API        │                 │
│   Mobile App    │◄────────────────────────►│   Backend       │◄────────────────────────►│  Gemini Live    │
│   (Expo)        │  JWT auth                 │   (Express+ws)  │  API Key                 │  API            │
│                 │  JSON messages            │                 │  Audio relay              │                 │
└─────────────────┘                           └─────────────────┘                           └─────────────────┘
```

- **Backend** đóng vai trò **proxy trung gian** giữa mobile và Gemini Live API
- API Key Google được giữ an toàn trên server, không lộ ra mobile
- Xác thực JWT trước khi cho phép kết nối WebSocket
- Lưu lịch sử hội thoại (phiên âm) vào cơ sở dữ liệu

---

## Luồng hoạt động

### 1. Kết nối

```
Mobile                          Backend                         Gemini Live API
  │                                │                                │
  │──── WS connect ───────────────►│                                │
  │     ?token=<JWT>               │                                │
  │                                │── Xác thực JWT ──►             │
  │                                │── Tạo ChatSession DB           │
  │                                │                                │
  │                                │──── WS connect ───────────────►│
  │                                │     ?key=<GOOGLE_API_KEY>      │
  │                                │                                │
  │                                │──── Setup message ────────────►│
  │                                │     (model, voice, system      │
  │                                │      prompt tiếng Việt)        │
  │                                │                                │
  │                                │◄──── setupComplete ───────────│
  │◄──── {type: "ready"} ─────────│                                │
  │                                │                                │
```

### 2. Người dùng gửi tin nhắn văn bản

```
Mobile                          Backend                         Gemini Live API
  │                                │                                │
  │── {type:"text",               │                                │
  │    content:"Tôi bị đau đầu"} ►│                                │
  │                                │── Lưu ChatMessage (USER) ──►  │
  │                                │── {realtimeInput:             │
  │                                │    {text:"Tôi bị đau đầu"}} ─►│
  │                                │                                │
  │                                │◄── Audio chunks (PCM 24kHz) ──│
  │                                │◄── outputTranscription ────────│
  │                                │◄── turnComplete ──────────────│
  │                                │                                │
  │◄── {type:"transcript_out",    │                                │
  │     text:"Bạn bị đau đầu..."}│                                │
  │                                │                                │
  │◄── {type:"audio_response",    │  (Backend ghép các audio       │
  │     audio:"<base64 WAV>"}     │   chunks thành file WAV)       │
  │                                │                                │
  │◄── {type:"turn_complete"}     │── Lưu ChatMessage ──►         │
  │                                │   (USER + ASSISTANT)           │
  │     [Phát audio + hiện phụ đề] │                                │
```

### 3. Người dùng gửi giọng nói

```
Mobile                          Backend                         Gemini Live API
  │                                │                                │
  │  [Nhấn mic → Ghi âm WAV      │                                │
  │   PCM 16kHz mono]             │                                │
  │  [Nhấn mic lần nữa → Dừng]   │                                │
  │                                │                                │
  │── {type:"audio",              │                                │
  │    data:"<base64 WAV>"} ──────►│                                │
  │                                │── Bóc header WAV (44 bytes)    │
  │                                │── {realtimeInput:             │
  │                                │    {audio:{data:"<PCM>",      │
  │                                │     mimeType:"audio/pcm;      │
  │                                │              rate=16000"}}} ──►│
  │                                │                                │
  │                                │◄── inputTranscription ────────│
  │◄── {type:"transcript_in",     │    ("Tôi bị đau đầu")         │
  │     text:"Tôi bị đau đầu"}   │                                │
  │                                │                                │
  │                                │◄── Audio chunks ──────────────│
  │                                │◄── outputTranscription ────────│
  │                                │◄── turnComplete ──────────────│
  │                                │                                │
  │◄── transcript_out + audio_response + turn_complete             │
  │     [Phát audio + hiện phụ đề] │                                │
```

---

## Giao thức tin nhắn WebSocket

### Mobile → Backend

| Loại | Format | Mô tả |
|------|--------|-------|
| Văn bản | `{type: "text", content: "..."}` | Người dùng gõ tin nhắn |
| Giọng nói | `{type: "audio", data: "<base64 WAV>"}` | File ghi âm WAV (PCM 16-bit, 16kHz, mono) |

### Backend → Mobile

| Loại | Format | Mô tả |
|------|--------|-------|
| Sẵn sàng | `{type: "ready", sessionId: "uuid"}` | Kết nối thành công, phiên bắt đầu |
| Audio AI | `{type: "audio_response", audio: "<base64 WAV>"}` | Giọng nói AI (WAV PCM 16-bit, 24kHz, mono) |
| Phụ đề AI | `{type: "transcript_out", text: "..."}` | Phiên âm câu trả lời AI (hiện phụ đề) |
| Phiên âm user | `{type: "transcript_in", text: "..."}` | Phiên âm giọng nói người dùng |
| Kết thúc lượt | `{type: "turn_complete"}` | AI đã nói xong |
| Bị ngắt | `{type: "interrupted"}` | Người dùng ngắt lời AI |
| Lỗi | `{type: "error", message: "..."}` | Thông báo lỗi |

---

## Giao diện người dùng

### Bố cục màn hình (Voice-first)

```
┌──────────────────────────────┐
│  ←  Chat AI            📋   │  Header (nút lịch sử bên phải)
│                              │
│    ┌──────────────────┐      │
│    │                  │      │
│    │   Avatar Video   │      │  talking_avatar.mp4 (AI nói)
│    │   (chiếm ~42%    │      │  waiting_avatar.mp4 (AI chờ)
│    │    màn hình)     │      │
│    │                  │      │
│    └──────────────────┘      │
│                              │
│  "Xin chào! Tôi có thể     │  Phụ đề (outputTranscription)
│   giúp gì cho bạn?"         │
│                              │
│  ┌────────────────────────┐  │
│  │  Nhập tin nhắn...      │  │  Ô nhập văn bản
│  └────────────────────────┘  │
│                              │
│       [🎤]      [📞]        │  Nút mic + Kết thúc
│                              │
└──────────────────────────────┘
```

### Máy trạng thái

| Trạng thái | Avatar | Nút Mic | Hành vi |
|------------|--------|---------|---------|
| `CONNECTING` | waiting + overlay "Đang kết nối..." | Vô hiệu | Đang mở WebSocket |
| `IDLE` | waiting_avatar.mp4 | Bật, sẵn sàng | Chờ người dùng nhập liệu |
| `LISTENING` | waiting_avatar.mp4 | Đỏ nhấp nháy | Đang ghi âm giọng nói |
| `PROCESSING` | waiting_avatar.mp4 + badge "AI đang suy nghĩ..." | Vô hiệu | Đã gửi, chờ AI trả lời |
| `AI_SPEAKING` | talking_avatar.mp4 | Nhấn = ngắt lời | Đang phát giọng nói AI + hiện phụ đề |

```
CONNECTING ──► IDLE ◄──► LISTENING
                │              │
                ▼              ▼
            PROCESSING ──► AI_SPEAKING
                ▲              │
                └──────────────┘
                 (turn_complete)
```

---

## Xử lý âm thanh

### Ghi âm (Mobile → Gemini)

| Thông số | Giá trị |
|----------|---------|
| Định dạng | WAV (PCM) |
| Mẫu bit | 16-bit, little-endian |
| Tần số lấy mẫu | 16.000 Hz |
| Kênh | Mono (1 kênh) |
| Kiểu ghi | Push-to-talk (nhấn bắt đầu, nhấn kết thúc) |

### Phát lại (Gemini → Mobile)

| Thông số | Giá trị |
|----------|---------|
| Định dạng | WAV (PCM) |
| Mẫu bit | 16-bit, little-endian |
| Tần số lấy mẫu | 24.000 Hz |
| Kênh | Mono (1 kênh) |
| Cách xử lý | Backend ghép audio chunks → tạo WAV header → gửi file hoàn chỉnh |

---

## Lưu trữ dữ liệu

Sử dụng bảng `ChatSession` và `ChatMessage` có sẵn trong hệ thống:

- **Khi kết nối:** Tạo `ChatSession` mới (title: "Voice Chat")
- **Khi người dùng gõ văn bản:** Lưu ngay `ChatMessage(role: USER)`
- **Khi AI nói xong (turnComplete):** Lưu cặp tin nhắn:
  - `ChatMessage(role: USER)` — phiên âm giọng nói người dùng
  - `ChatMessage(role: ASSISTANT)` — phiên âm câu trả lời AI
- **Xem lịch sử:** REST API cũ vẫn hoạt động (`GET /ai/chat/sessions`, `GET /ai/chat/sessions/:id`)

---

## Cấu hình Gemini Live API

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
      "parts": [{
        "text": "Bạn là trợ lý y tế ảo của hệ thống đặt lịch khám bệnh..."
      }]
    },
    "realtimeInputConfig": {
      "inputAudioTranscription": {}
    },
    "outputAudioTranscription": {}
  }
}
```

---

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `GOOGLE_API_KEY` | API Key của Google (dùng cho cả Maps và Gemini) | `AIzaSy...` |
| `JWT_SECRET` | Secret để xác thực JWT trên WebSocket | `your-secret` |

---

## Cấu trúc file

```
backend/
├── src/modules/ai/
│   ├── voice-chat.gateway.ts    ← WebSocket server + Gemini relay (MỚI)
│   ├── ai.service.ts            ← Service cũ (giữ cho extractSymptoms)
│   ├── ai.controller.ts         ← Controller (giữ GET sessions)
│   ├── ai.routes.ts             ← Routes (đã xóa POST /chat)
│   └── ai.schemas.ts            ← Zod schemas
├── src/app.ts                   ← Mount WebSocket lên HTTP server

mobile/
├── asset/
│   ├── talking_avatar.mp4       ← Video AI đang nói
│   └── waiting_avatar.mp4       ← Video AI đang chờ
├── src/screens/chat/
│   ├── chat-screen.tsx          ← VoiceChatScreen (VIẾT LẠI)
│   └── chat-history-screen.tsx  ← Lịch sử chat (GIỮ NGUYÊN)
├── src/services/
│   └── chat.service.ts          ← Đã xóa sendChatMessage
```

---

## Hạn chế & ghi chú

- **Android:** Ghi âm WAV/PCM có thể không hoạt động trên mọi thiết bị Android (do MediaRecorder không hỗ trợ WAV gốc). iOS hoạt động hoàn hảo với LINEARPCM.
- **Timeout:** Phiên tự động đóng sau 5 phút không hoạt động.
- **Không reconnect:** Nếu WebSocket bị ngắt, người dùng cần quay lại và mở lại tab Chat AI.
- **Giọng nói AI:** Sử dụng giọng "Kore" mặc định của Gemini, hỗ trợ tiếng Việt.
- **Push-to-talk:** Không phải ghi âm liên tục — người dùng nhấn mic để bắt đầu, nhấn lại để dừng và gửi.
