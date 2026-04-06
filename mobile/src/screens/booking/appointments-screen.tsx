import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMyAppointments } from '../../hooks/use-my-appointments';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { theme, systemColors } from '../../constants/theme';
import type { Appointment } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }
> = {
  PENDING: { color: systemColors.orange, icon: 'clock-outline', label: 'Pending' },
  CONFIRMED: { color: systemColors.blue, icon: 'check-circle-outline', label: 'Confirmed' },
  COMPLETED: { color: systemColors.green, icon: 'check-decagram', label: 'Completed' },
  CANCELED: { color: systemColors.red, icon: 'close-circle-outline', label: 'Canceled' },
};

function formatDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getCountdown(dateStr?: string, timeStr?: string): string {
  if (!dateStr || !timeStr) return '';
  const apptDate = new Date(`${dateStr}T${timeStr}`);
  const now = new Date();
  const diffMs = apptDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) return '';
  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Tomorrow at ${timeStr}`;
  return `In ${diffDays} days`;
}

function isUpcoming(appointment: Appointment): boolean {
  return appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
}

function isPast(appointment: Appointment): boolean {
  return appointment.status === 'COMPLETED' || appointment.status === 'CANCELED';
}

// ---------------------------------------------------------------------------
// FadeInView
// ---------------------------------------------------------------------------

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.color + '18' }]}>
      <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
      <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Tab Switcher
// ---------------------------------------------------------------------------

type TabKey = 'upcoming' | 'past';

interface TabSwitcherProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  upcomingCount: number;
  pastCount: number;
}

function TabSwitcher({ activeTab, onTabChange, upcomingCount, pastCount }: TabSwitcherProps) {
  return (
    <View style={tabStyles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onTabChange('upcoming')}
        style={[tabStyles.tab, activeTab === 'upcoming' && tabStyles.tabActive]}
      >
        <Text
          style={[tabStyles.tabText, activeTab === 'upcoming' && tabStyles.tabTextActive]}
        >
          Upcoming
        </Text>
        {upcomingCount > 0 && (
          <View
            style={[
              tabStyles.countBadge,
              {
                backgroundColor:
                  activeTab === 'upcoming' ? '#fff' : systemColors.blue + '18',
              },
            ]}
          >
            <Text
              style={[
                tabStyles.countText,
                {
                  color:
                    activeTab === 'upcoming' ? systemColors.blue : systemColors.blue,
                },
              ]}
            >
              {upcomingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onTabChange('past')}
        style={[tabStyles.tab, activeTab === 'past' && tabStyles.tabActive]}
      >
        <Text
          style={[tabStyles.tabText, activeTab === 'past' && tabStyles.tabTextActive]}
        >
          Past
        </Text>
        {pastCount > 0 && (
          <View
            style={[
              tabStyles.countBadge,
              {
                backgroundColor:
                  activeTab === 'past' ? '#fff' : systemColors.gray + '18',
              },
            ]}
          >
            <Text
              style={[
                tabStyles.countText,
                {
                  color:
                    activeTab === 'past' ? systemColors.blue : systemColors.gray,
                },
              ]}
            >
              {pastCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: systemColors.gray5,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: systemColors.blue,
    shadowColor: systemColors.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: systemColors.gray,
  },
  tabTextActive: {
    color: '#fff',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Appointment Card
// ---------------------------------------------------------------------------

interface AppointmentCardProps {
  appointment: Appointment;
  showCountdown?: boolean;
  delay?: number;
}

function AppointmentCard({ appointment, showCountdown, delay = 0 }: AppointmentCardProps) {
  const countdown = showCountdown
    ? getCountdown(appointment.timeSlot?.date, appointment.timeSlot?.startTime)
    : '';

  return (
    <FadeInView delay={delay}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/appointment-detail',
            params: { id: appointment.id },
          })
        }
      >
        <GlassCard style={cardStyles.card} glassStyle="regular">
          <View style={cardStyles.inner}>
            {/* Top row: doctor name + status badge */}
            <View style={cardStyles.topRow}>
              <View style={cardStyles.nameCol}>
                <Text style={cardStyles.doctorName} numberOfLines={1}>
                  {appointment.doctor?.name ?? 'Doctor'}
                </Text>
                <Text style={cardStyles.specialtyText} numberOfLines={1}>
                  {appointment.doctor?.specialty?.name ?? 'Specialty'}
                </Text>
              </View>
              <StatusBadge status={appointment.status} />
            </View>

            {/* Date & time row */}
            <View style={cardStyles.detailSection}>
              <View style={cardStyles.detailRow}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={16}
                  color={systemColors.orange}
                />
                <Text style={cardStyles.detailText}>
                  {formatDate(appointment.timeSlot?.date)}
                  {' \u2022 '}
                  {appointment.timeSlot?.startTime} - {appointment.timeSlot?.endTime}
                </Text>
              </View>

              {/* Countdown for upcoming */}
              {showCountdown && countdown ? (
                <View style={cardStyles.detailRow}>
                  <MaterialCommunityIcons
                    name="timer-sand"
                    size={16}
                    color={systemColors.blue}
                  />
                  <Text style={[cardStyles.detailText, { color: systemColors.blue }]}>
                    {countdown}
                  </Text>
                </View>
              ) : null}

              {/* Amount */}
              <View style={cardStyles.detailRow}>
                <MaterialCommunityIcons
                  name="cash"
                  size={16}
                  color={systemColors.green}
                />
                <Text style={cardStyles.detailText}>
                  {appointment.totalAmount.toLocaleString()} VND
                </Text>
              </View>
            </View>

            {/* Review indicator for past */}
            {appointment.status === 'COMPLETED' && appointment.review && (
              <View style={cardStyles.reviewRow}>
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color={systemColors.yellow}
                />
                <Text style={cardStyles.reviewText}>
                  Reviewed ({appointment.review.rating}/5)
                </Text>
              </View>
            )}

            {/* Chevron hint */}
            <View style={cardStyles.chevronRow}>
              <Text style={cardStyles.viewDetailText}>View details</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={systemColors.gray3}
              />
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </FadeInView>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  inner: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  specialtyText: {
    fontSize: 14,
    color: systemColors.gray,
  },
  detailSection: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewText: {
    fontSize: 13,
    color: systemColors.yellow,
    fontWeight: '600',
  },
  chevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 13,
    color: systemColors.gray3,
  },
});

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  tab: TabKey;
}

function EmptyState({ tab }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <MaterialCommunityIcons
        name={tab === 'upcoming' ? 'calendar-blank-outline' : 'history'}
        size={48}
        color={systemColors.gray3}
      />
      <Text style={emptyStyles.title}>
        {tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
      </Text>
      <Text style={emptyStyles.caption}>
        {tab === 'upcoming'
          ? 'Book an appointment to get started.'
          : 'Your completed and canceled appointments will appear here.'}
      </Text>
      {tab === 'upcoming' && (
        <Button
          mode="contained"
          onPress={() => router.push('/booking')}
          buttonColor={systemColors.blue}
          textColor="#fff"
          icon="calendar-plus"
          style={emptyStyles.bookBtn}
        >
          Book Now
        </Button>
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 12,
  },
  caption: {
    fontSize: 14,
    color: systemColors.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  bookBtn: {
    marginTop: 16,
    borderRadius: 12,
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const { appointments, isLoading, reload } = useMyAppointments();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const upcomingAppointments = appointments
    .filter(isUpcoming)
    .sort((a, b) => {
      const dateA = a.timeSlot?.date ?? '';
      const dateB = b.timeSlot?.date ?? '';
      const timeA = a.timeSlot?.startTime ?? '';
      const timeB = b.timeSlot?.startTime ?? '';
      return `${dateA}${timeA}`.localeCompare(`${dateB}${timeB}`);
    });

  const pastAppointments = appointments
    .filter(isPast)
    .sort((a, b) => {
      const dateA = a.timeSlot?.date ?? '';
      const dateB = b.timeSlot?.date ?? '';
      const timeA = a.timeSlot?.startTime ?? '';
      const timeB = b.timeSlot?.startTime ?? '';
      return `${dateB}${timeB}`.localeCompare(`${dateA}${timeA}`);
    });

  const displayedAppointments =
    activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <ScreenBackground>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[systemColors.orange, '#C93400']}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.heroTitle}>My Appointments</Text>
        <Text style={styles.heroSub}>
          {appointments.length} total
          {' \u2022 '}
          {upcomingAppointments.length} upcoming
        </Text>
      </LinearGradient>

      {/* Tab Switcher */}
      <TabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        upcomingCount={upcomingAppointments.length}
        pastCount={pastAppointments.length}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.loadingLottie}
          />
        </View>
      ) : displayedAppointments.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <View style={styles.cardList}>
          {displayedAppointments.map((appt, i) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              showCountdown={activeTab === 'upcoming'}
              delay={i * 60}
            />
          ))}
        </View>
      )}
    </ScrollView>
    </ScreenBackground>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  hero: {
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  loadingLottie: {
    width: 100,
    height: 100,
  },
  cardList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
});
