import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { GoogleGenAI, Modality } from '@google/genai';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import type { ChatMessageRole } from '@prisma/client';

const GOOGLE_API_KEY = 'AIzaSyAxu3R5xFTtKDJAxFXX12lnwW5Tn2uoGRs';
const GEMINI_MODEL = 'gemini-3.1-flash-live-preview';

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

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
  geminiSession: any | null;
  audioChunks: Buffer[];
  inputTranscript: string;
  outputTranscript: string;
  inactivityTimer: ReturnType<typeof setTimeout> | null;
}

// ── WAV helpers ──────────────────────────────────────────────

function stripWavHeader(wavBase64: string): string {
  const buf = Buffer.from(wavBase64, 'base64');
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF') {
    return buf.slice(44).toString('base64');
  }
  return wavBase64;
}

function createWavBuffer(pcmData: Buffer, sampleRate = 24000): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  return Buffer.concat([header, pcmData]);
}

// ── Handle Gemini SDK message ────────────────────────────────

function handleGeminiSdkMessage(
  response: any,
  session: ClientSession,
  clientWs: WebSocket,
) {
  const sc = response.serverContent;
  if (!sc) return;

  if (sc.modelTurn?.parts) {
    for (const part of sc.modelTurn.parts) {
      if (part.inlineData?.data) {
        session.audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
      }
    }
  }

  if (sc.outputTranscription?.text) {
    session.outputTranscript += sc.outputTranscription.text;
    send(clientWs, {
      type: 'transcript_out',
      text: sc.outputTranscription.text,
    });
  }

  if (sc.inputTranscription?.text) {
    session.inputTranscript += sc.inputTranscription.text;
    send(clientWs, {
      type: 'transcript_in',
      text: sc.inputTranscription.text,
    });
  }

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

  if (sc.interrupted) {
    session.audioChunks = [];
    send(clientWs, { type: 'interrupted' });
  }
}

// ── Handle client message ────────────────────────────────────

function handleClientMessage(raw: Buffer | string, session: ClientSession) {
  const gemini = session.geminiSession;
  if (!gemini) return;

  let msg: any;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  if (msg.type === 'audio') {
    const pcmBase64 = stripWavHeader(msg.data);
    gemini.sendRealtimeInput({
      audio: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' },
    });
  } else if (msg.type === 'text') {
    prisma.chatMessage
      .create({
        data: {
          sessionId: session.chatSessionId,
          role: 'USER' as ChatMessageRole,
          content: msg.content,
        },
      })
      .catch(console.error);

    gemini.sendRealtimeInput({ text: msg.content });
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
    session.geminiSession?.close();
  }, INACTIVITY_TIMEOUT_MS);
}

function cleanup(session: ClientSession) {
  if (session.inactivityTimer) clearTimeout(session.inactivityTimer);
  try {
    session.geminiSession?.close();
  } catch { /* ignore */ }
  session.geminiSession = null;
}

// ── Public setup ─────────────────────────────────────────────

export function setupVoiceChatWs(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/voice-chat' });

  wss.on('connection', async (clientWs, req) => {
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

    const chatSession = await prisma.chatSession.create({
      data: { userId, title: 'Voice Chat' },
    });

    const session: ClientSession = {
      userId,
      chatSessionId: chatSession.id,
      geminiSession: null,
      audioChunks: [],
      inputTranscript: '',
      outputTranscript: '',
      inactivityTimer: null,
    };

    try {
      const geminiSession = await ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
          systemInstruction: {
            parts: [{ text: VOICE_SYSTEM_PROMPT }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            send(clientWs, { type: 'ready', sessionId: session.chatSessionId });
            resetInactivityTimer(session, clientWs);
          },
          onmessage: (message: any) => {
            handleGeminiSdkMessage(message, session, clientWs);
          },
          onerror: (e: any) => {
            console.error('[voice-chat] Gemini SDK error:', e.message);
            send(clientWs, { type: 'error', message: 'Lỗi kết nối AI' });
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
          },
        },
      });

      session.geminiSession = geminiSession;
    } catch (err: any) {
      console.error('[voice-chat] Failed to connect to Gemini:', err.message);
      send(clientWs, { type: 'error', message: 'Không thể kết nối AI' });
      clientWs.close(4002, 'Gemini connection failed');
      return;
    }

    clientWs.on('message', (data) => {
      handleClientMessage(data as Buffer, session);
      resetInactivityTimer(session, clientWs);
    });

    clientWs.on('close', () => cleanup(session));
    clientWs.on('error', (err) => {
      console.error('[voice-chat] Client WS error:', err.message);
      cleanup(session);
    });
  });

  console.log('[voice-chat] WebSocket server ready at /ws/voice-chat');
}
