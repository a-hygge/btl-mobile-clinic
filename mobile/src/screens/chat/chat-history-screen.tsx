import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, systemColors } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { getChatSessions, type ChatSessionItem } from '../../services/chat.service';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export function ChatHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getChatSessions();
      setSessions(data);
    } catch {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionPress = useCallback((session: ChatSessionItem) => {
    router.push({
      pathname: '/chat' as never,
      params: { sessionId: session.id },
    });
  }, []);

  const renderSession = useCallback(
    ({ item }: { item: ChatSessionItem }) => (
      <Pressable onPress={() => handleSessionPress(item)}>
        <GlassCard style={styles.sessionCard} interactive>
          <View style={styles.sessionContent}>
            <View style={styles.sessionIcon}>
              <MaterialCommunityIcons
                name="chat-outline"
                size={24}
                color={systemColors.blue}
              />
            </View>
            <View style={styles.sessionInfo}>
              <Text variant="titleSmall" style={styles.sessionTitle} numberOfLines={1}>
                {item.title ?? 'New Conversation'}
              </Text>
              {item.lastMessage && (
                <Text variant="bodySmall" style={styles.sessionPreview} numberOfLines={2}>
                  {item.lastMessage.role === 'ASSISTANT' ? 'AI: ' : 'You: '}
                  {item.lastMessage.content}
                </Text>
              )}
              <Text variant="labelSmall" style={styles.sessionDate}>
                {formatDate(item.updatedAt)}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={systemColors.gray3}
            />
          </View>
        </GlassCard>
      </Pressable>
    ),
    [handleSessionPress]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text variant="titleMedium" style={styles.headerTitle}>
            Chat History
          </Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={systemColors.blue} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="chat-remove-outline"
            size={64}
            color={systemColors.gray3}
          />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No conversations yet
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Start a new chat with the AI assistant
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  sessionCard: {
    borderRadius: 16,
    marginBottom: 2,
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sessionPreview: {
    color: systemColors.gray,
    lineHeight: 18,
  },
  sessionDate: {
    color: systemColors.gray2,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: systemColors.gray,
    fontWeight: '600',
  },
  emptySubtext: {
    color: systemColors.gray2,
  },
});
