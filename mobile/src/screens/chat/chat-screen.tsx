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
// expo-video loaded lazily — may not be in native build
let VideoView: any = null;
let useVideoPlayer: any = null;
try {
  const mod = require('expo-video');
  VideoView = mod.VideoView;
  useVideoPlayer = mod.useVideoPlayer;
} catch {
  console.warn('[Chat] expo-video not available');
}
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientHeader } from '../../components/shared/GradientHeader';
import {
  figmaColors,
  figmaFonts,
  figmaSpacing,
  figmaRadius,
} from '../../constants/theme';

// Lazy-load expo-av (requires native build / dev client)
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch {
  console.warn('[VoiceChat] expo-av not available — audio disabled');
}

// Assets — MP4 avatar animations
const TALKING_VIDEO = require('../../../asset/talking_avatar.mp4');
const WAITING_VIDEO = require('../../../asset/waiting_avatar.mp4');

// Derive WS URL from API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const WS_URL = API_URL.replace(/^http/, 'ws').replace('/api/v1', '') + '/ws/voice-chat';

type VoiceState = 'CONNECTING' | 'IDLE' | 'LISTENING' | 'PROCESSING' | 'AI_SPEAKING';

// Recording options built lazily (Audio may not be available in Expo Go)
function getRecordingOptions() {
  if (!Audio) return null;
  return {
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
}

/**
 * Voice-first AI chat screen.
 * Exported as ChatScreen to keep tab route unchanged.
 */
export function ChatScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [state, setState] = useState<VoiceState>('CONNECTING');
  const [subtitle, setSubtitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<any>(null);
  const soundRef = useRef<any>(null);

  // ── Video player for avatar (may be null if expo-video unavailable) ──
  const player = useVideoPlayer ? useVideoPlayer(WAITING_VIDEO, (p: any) => {
    p.loop = true;
    p.play();
  }) : null;

  // ── Load token from SecureStore ──────────────────────────

  useEffect(() => {
    SecureStore.getItemAsync('accessToken').then((t) => {
      if (t) setToken(t);
    });
  }, []);

  // ── Derived state ───────────────────────────────────────
  const isTalking = state === 'AI_SPEAKING';
  const micDisabled = state === 'CONNECTING' || state === 'PROCESSING';

  // ── Switch avatar video on state change ──────────────────
  useEffect(() => {
    if (!player) return;
    const source = isTalking ? TALKING_VIDEO : WAITING_VIDEO;
    player.replace(source);
    player.loop = true;
    player.play();
  }, [isTalking]);

  // ── WebSocket lifecycle ──────────────────────────────────

  useEffect(() => {
    if (!token) {
      console.log('[FE-WS] no token yet, skipping WS connect');
      return;
    }

    const url = `${WS_URL}?token=${token}`;
    console.log('[FE-WS] connecting to:', url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[FE-WS] ✅ onopen — readyState:', ws.readyState);
    };

    ws.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        console.log('[FE-WS] non-JSON message:', String(event.data).slice(0, 200));
        return;
      }

      console.log('[FE-WS] message:', msg.type, JSON.stringify(msg).slice(0, 300));

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
          break;

        case 'audio_response':
          setState('AI_SPEAKING');
          playAudio(msg.audio);
          break;

        case 'turn_complete':
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
          console.warn('[FE-WS] server error:', msg.message);
          setState('IDLE');
          break;
      }
    };

    ws.onclose = (event) => {
      console.log('[FE-WS] ❌ onclose — code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean);
    };

    ws.onerror = (err) => {
      console.error('[FE-WS] onerror:', JSON.stringify(err));
      setState('IDLE');
      setSubtitle('Kết nối voice không thành công. Bạn có thể nhập tin nhắn bằng văn bản.');
    };

    // Fallback: if not ready after 5s, go IDLE for text-only mode
    const timeout = setTimeout(() => {
      console.log('[FE-WS] 5s timeout — readyState:', ws.readyState, 'state:', state);
      if (ws.readyState !== WebSocket.OPEN || state === 'CONNECTING') {
        setState('IDLE');
        setSubtitle('Đang chờ kết nối voice... Bạn có thể nhập tin nhắn.');
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      ws.close();
    };
  }, [token]);

  // ── Audio playback ───────────────────────────────────────

  const playAudio = async (wavBase64: string) => {
    if (!Audio) return;
    try {
      await stopPlayback();
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

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
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
    if (!Audio) return;
    try {
      // Clean up any existing recording first
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch { /* ignore */ }
        recordingRef.current = null;
      }

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const opts = getRecordingOptions();
      if (!opts) return;
      const { recording } = await Audio.Recording.createAsync(opts);
      recordingRef.current = recording;
      setState('LISTENING');
    } catch (err) {
      console.error('[VoiceChat] Recording start error:', err);
      setState('IDLE');
      setSubtitle('Không thể ghi âm. Vui lòng nhập tin nhắn bằng văn bản.');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      console.log('[FE-WS] stopRecording — uri:', uri ? 'yes' : 'no', 'ws readyState:', wsRef.current?.readyState);
      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('[FE-WS] sending audio, size:', base64.length, 'chars');
        wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
        setState('PROCESSING');
        setSubtitle('');

        // Timeout: if no response in 15s, go back to IDLE
        setTimeout(() => {
          setState((prev) => prev === 'PROCESSING' ? 'IDLE' : prev);
          setSubtitle((prev) => prev || 'Không nhận được phản hồi. Thử lại hoặc nhập văn bản.');
        }, 15000);
      } else {
        console.log('[FE-WS] WS not open, cannot send audio');
        setState('IDLE');
        setSubtitle('Kết nối voice đã mất. Vui lòng nhập văn bản.');
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

  const sendText = useCallback(async () => {
    const text = textInput.trim();
    if (!text || state !== 'IDLE') return;

    setTextInput('');
    setState('PROCESSING');
    setSubtitle('');

    // Try WS first
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', content: text }));
      return;
    }

    // Fallback: REST API for text chat
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
      setSubtitle(reply);
      setState('IDLE');
    } catch (err) {
      console.error('[Chat] REST fallback error:', err);
      setSubtitle('Không thể gửi tin nhắn. Vui lòng thử lại.');
      setState('IDLE');
    }
  }, [textInput, state, token]);

  // ── End session ─────────────────────────────────────────

  const endSession = useCallback(() => {
    wsRef.current?.close();
    router.back();
  }, []);

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
          {VideoView && player ? (
            <VideoView
              player={player}
              style={styles.avatar}
              nativeControls={false}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: figmaColors.pastelBlue }]}>
              <MaterialCommunityIcons
                name={isTalking ? 'account-voice' : 'robot-outline'}
                size={80}
                color={isTalking ? figmaColors.primary : figmaColors.textMuted}
              />
            </View>
          )}
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
