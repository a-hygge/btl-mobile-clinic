import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { systemColors, spacing, theme } from '../../constants/theme';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
  type NotificationType,
} from '../../services/notification.service';

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  APPOINTMENT_REMINDER: 'calendar-clock',
  APPOINTMENT_CONFIRMED: 'calendar-check',
  APPOINTMENT_CANCELED: 'calendar-remove',
  MEDICINE_REMINDER: 'pill',
  HEALTH_ALERT: 'heart-pulse',
  SYSTEM: 'bell',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  APPOINTMENT_REMINDER: systemColors.blue,
  APPOINTMENT_CONFIRMED: systemColors.green,
  APPOINTMENT_CANCELED: systemColors.red,
  MEDICINE_REMINDER: systemColors.teal,
  HEALTH_ALERT: systemColors.orange,
  SYSTEM: systemColors.purple,
};

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications({ limit: 50 });
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={systemColors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#FF9500', '#C93400']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <MaterialCommunityIcons name="bell" size={32} color="#fff" />
              <Text variant="headlineMedium" style={styles.headerTitle}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text variant="bodyMedium" style={styles.headerSubtitle}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
            {unreadCount > 0 && (
              <Button
                mode="contained"
                onPress={handleMarkAllAsRead}
                loading={markingAll}
                disabled={markingAll}
                compact
                style={styles.markAllBtn}
                buttonColor="rgba(255,255,255,0.25)"
                textColor="#fff"
              >
                Read All
              </Button>
            )}
          </View>
        </LinearGradient>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <EmptyState message="No notifications yet. You'll see updates about appointments, reminders, and more here." />
        ) : (
          <View style={styles.listContainer}>
            {notifications.map((notification, index) => (
              <FadeInView key={notification.id} delay={index * 60}>
                <GlassCard style={styles.notificationCard}>
                  <View>
                    <View
                      style={styles.notificationRow}
                      onTouchEnd={() => handleMarkAsRead(notification)}
                    >
                      {/* Unread dot */}
                      {!notification.isRead && <View style={styles.unreadDot} />}

                      {/* Icon */}
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: `${NOTIFICATION_COLORS[notification.type]}15`,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={NOTIFICATION_ICONS[notification.type]}
                          size={24}
                          color={NOTIFICATION_COLORS[notification.type]}
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.notificationContent}>
                        <Text
                          variant="titleSmall"
                          style={[
                            styles.notificationTitle,
                            !notification.isRead && styles.notificationTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={styles.notificationBody}
                          numberOfLines={2}
                        >
                          {notification.body}
                        </Text>
                        <Text variant="labelSmall" style={styles.notificationTime}>
                          {formatRelativeTime(notification.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </FadeInView>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTextContainer: {
    gap: 4,
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  markAllBtn: {
    borderRadius: 20,
  },
  // List
  listContainer: {
    marginTop: spacing.md,
  },
  notificationCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: systemColors.blue,
    marginTop: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationBody: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  notificationTime: {
    color: systemColors.gray,
    marginTop: 4,
  },
});
