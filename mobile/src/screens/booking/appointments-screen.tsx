import { useCallback, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import { useMyAppointments } from '../../hooks/use-my-appointments';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  EmptyState,
  FadeInView,
  GradientHeader,
  ScreenContainer,
  StatusBadge,
  TabSwitcher,
} from '../../components/shared';
import { formatDate, getCountdown } from '../../utils/format';
import { theme, systemColors } from '../../constants/theme';
import type { Appointment } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUpcoming(appointment: Appointment): boolean {
  return appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
}

function isPast(appointment: Appointment): boolean {
  return appointment.status === 'COMPLETED' || appointment.status === 'CANCELED';
}

// ---------------------------------------------------------------------------
// Tab Switcher
// ---------------------------------------------------------------------------

type TabKey = 'upcoming' | 'past';

// ---------------------------------------------------------------------------
// Appointment Card
// ---------------------------------------------------------------------------

interface AppointmentCardProps {
  appointment: Appointment;
  showCountdown?: boolean;
  delay?: number;
}

function AppointmentCard({ appointment, showCountdown, delay = 0 }: AppointmentCardProps) {
  const slotDate = appointment.timeSlot?.date;
  const slotStart = appointment.timeSlot?.startTime;
  const countdown =
    showCountdown && slotDate && slotStart ? getCountdown(slotDate, slotStart) : '';

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
// Main Screen
// ---------------------------------------------------------------------------

export function AppointmentsScreen() {
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
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <GradientHeader
        title="My Appointments"
        subtitle={`${appointments.length} total \u2022 ${upcomingAppointments.length} upcoming`}
        colors={[systemColors.orange, '#C93400']}
      />

      {/* Tab Switcher */}
      <TabSwitcher<TabKey>
        tabs={[
          { value: 'upcoming', label: 'Upcoming', badge: upcomingAppointments.length || undefined },
          { value: 'past', label: 'Past', badge: pastAppointments.length || undefined },
        ]}
        value={activeTab}
        onChange={setActiveTab}
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
        <EmptyState
          icon={activeTab === 'upcoming' ? 'calendar-blank-outline' : 'history'}
          title={
            activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'
          }
          message={
            activeTab === 'upcoming'
              ? 'Book an appointment to get started.'
              : 'Your completed and canceled appointments will appear here.'
          }
          action={
            activeTab === 'upcoming'
              ? { label: 'Book Now', onPress: () => router.push('/booking') }
              : undefined
          }
        />
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
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
