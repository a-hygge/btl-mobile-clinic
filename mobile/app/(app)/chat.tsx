import { useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '../../src/screens/chat/chat-screen';
import { getSessionMessages } from '../../src/services/chat.service';

export default function ChatRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const chatRef = useRef<{ loadSession: (id: string) => void }>(null);

  // If navigated with a sessionId param, load that session
  useEffect(() => {
    if (sessionId) {
      // Small delay to ensure the screen is mounted
      const timer = setTimeout(() => {
        chatRef.current?.loadSession(sessionId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sessionId]);

  return <ChatScreen />;
}
