import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useMyAppointments } from '../../hooks/use-my-appointments';
import { GlassCard } from '../../components/ui/GlassCard';
import { theme, systemColors } from '../../constants/theme';

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }
> = {
  PENDING: { color: systemColors.orange, icon: 'clock-outline', label: 'Pending' },
  CONFIRMED: { color: systemColors.blue, icon: 'check-circle-outline', label: 'Confirmed' },
  COMPLETED: { color: systemColors.green, icon: 'check-decagram', label: 'Completed' },
  CANCELED: { color: systemColors.red, icon: 'close-circle-outline', label: 'Canceled' },
};

type FilterStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELED', label: 'Canceled' },
];

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

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ---------------------------------------------------------------------------
// Filter pill component
// ---------------------------------------------------------------------------

interface FilterPillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

function FilterPill({ label, selected, onPress, color }: FilterPillProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        filterStyles.pill,
        selected && {
          backgroundColor: color ?? systemColors.blue,
          borderColor: color ?? systemColors.blue,
        },
      ]}
    >
      <Text
        style={[filterStyles.pillText, selected && filterStyles.pillTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const filterStyles = StyleSheet.create({
  pill: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: systemColors.gray4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  pillTextActive: {
    color: '#fff',
  },
});

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
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
// Main screen
// ---------------------------------------------------------------------------

export function AppointmentsScreen() {
  const { appointments, isLoading, error, reload, cancelById } = useMyAppointments();
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const filtered =
    filter === 'ALL' ? appointments : appointments.filter((a) => a.status === filter);

  async function handleCancel(id: string) {
    try {
      await cancelById(id);
      setNotice('Appointment canceled.');
    } catch {
      setNotice('Could not cancel appointment.');
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Compact hero header */}
      <LinearGradient
        colors={[systemColors.orange, '#C93400']}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>My Appointments</Text>
        <Text style={styles.heroSub}>
          {appointments.length} total
          {' \u2022 '}
          {appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length}
          {' upcoming'}
        </Text>
      </LinearGradient>

      {/* Filter chips — horizontal scroll, pill-shaped */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_OPTIONS.map((opt) => (
          <FilterPill
            key={opt.key}
            label={opt.label}
            selected={filter === opt.key}
            onPress={() => setFilter(opt.key)}
            color={
              opt.key === 'ALL'
                ? systemColors.blue
                : STATUS_CONFIG[opt.key]?.color
            }
          />
        ))}
      </ScrollView>

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
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={48}
            color={systemColors.gray3}
          />
          <Text style={styles.emptyTitle}>No appointments found</Text>
          <Text style={styles.emptyCaption}>
            {filter === 'ALL'
              ? 'Book your first appointment to get started.'
              : 'No appointments match this filter.'}
          </Text>
          <Button
            mode="contained"
            onPress={() => void reload()}
            buttonColor={systemColors.blue}
            textColor="#fff"
            style={styles.refreshBtn}
          >
            Refresh
          </Button>
        </View>
      ) : (
        <View style={styles.cardList}>
          {filtered.map((appt, i) => (
            <FadeInView key={appt.id} delay={i * 60}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  {/* Top row: doctor name + status badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardNameCol}>
                      <Text style={styles.doctorName} numberOfLines={1}>
                        {appt.doctor?.name ?? 'Doctor'}
                      </Text>
                      <Text style={styles.specialtyText} numberOfLines={1}>
                        {appt.doctor?.specialty?.name ?? 'Specialty'}
                      </Text>
                    </View>
                    <StatusBadge status={appt.status} />
                  </View>

                  {/* Detail rows */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={systemColors.orange}
                      />
                      <Text style={styles.detailText}>
                        {formatDate(appt.timeSlot?.date)}
                        {' \u2022 '}
                        {appt.timeSlot?.startTime} - {appt.timeSlot?.endTime}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="cash"
                        size={16}
                        color={systemColors.green}
                      />
                      <Text style={styles.detailText}>
                        {appt.totalAmount.toLocaleString()} VND
                      </Text>
                    </View>
                  </View>

                  {/* Cancel button */}
                  {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => void handleCancel(appt.id)}
                      textColor={systemColors.red}
                      style={styles.cancelBtn}
                      labelStyle={styles.cancelLabel}
                    >
                      Cancel appointment
                    </Button>
                  )}
                </View>
              </GlassCard>
            </FadeInView>
          ))}
        </View>
      )}

      <Snackbar visible={Boolean(error || notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice || error}
      </Snackbar>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  hero: {
    paddingTop: 52,
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
  filterScroll: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 12,
  },
  emptyCaption: {
    fontSize: 14,
    color: systemColors.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  refreshBtn: {
    marginTop: 16,
    borderRadius: 12,
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardInner: {
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardNameCol: {
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
  cancelBtn: {
    alignSelf: 'flex-end',
    borderColor: systemColors.red + '40',
    borderRadius: 12,
  },
  cancelLabel: {
    fontSize: 13,
  },
});
