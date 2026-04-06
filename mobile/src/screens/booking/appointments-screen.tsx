import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Snackbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useMyAppointments } from '../../hooks/use-my-appointments';
import { GlassCard } from '../../components/ui/GlassCard';
import { theme, systemColors } from '../../constants/theme';

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = {
  PENDING: { color: '#FF9500', icon: 'clock-outline', label: 'Pending' },
  CONFIRMED: { color: '#007AFF', icon: 'check-circle-outline', label: 'Confirmed' },
  COMPLETED: { color: '#34C759', icon: 'check-decagram', label: 'Completed' },
  CANCELED: { color: '#FF3B30', icon: 'close-circle-outline', label: 'Canceled' },
};

type FilterStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';

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

export function AppointmentsScreen() {
  const { appointments, isLoading, error, reload, cancelById } = useMyAppointments();
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter((a) => a.status === filter);

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
      <LinearGradient
        colors={['#FF9500', '#C93400']}
        style={styles.hero}
      >
        <Text variant="headlineMedium" style={styles.heroTitle}>
          My Appointments
        </Text>
        <Text variant="bodyMedium" style={styles.heroSub}>
          {appointments.length} total • {appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length} upcoming
        </Text>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED'] as FilterStatus[]).map((s) => (
          <Chip
            key={s}
            selected={filter === s}
            onPress={() => setFilter(s)}
            compact
            style={[styles.filterChip, filter === s && styles.filterChipActive]}
            textStyle={filter === s ? styles.filterTextActive : undefined}
          >
            {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
          </Chip>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <LottieView
            source={require('../../assets/animations/empty-state.json')}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No appointments found
          </Text>
          <Button mode="contained" onPress={() => void reload()} style={{ marginTop: 12 }}>
            Refresh
          </Button>
        </View>
      ) : (
        filtered.map((appt, i) => {
          const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.PENDING;
          return (
            <FadeInView key={appt.id} delay={i * 60}>
              <GlassCard style={styles.card} tintColor={cfg.color}>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                    <View style={styles.cardInfo}>
                      <Text variant="titleMedium" style={styles.doctorName}>
                        {appt.doctor?.name ?? 'Doctor'}
                      </Text>
                      <Text variant="bodySmall" style={styles.meta}>
                        {appt.doctor?.specialty?.name ?? 'Specialty'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                      <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
                      <Text variant="labelSmall" style={{ color: cfg.color, fontWeight: '600' }}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar" size={16} color={systemColors.gray} />
                    <Text variant="bodyMedium" style={styles.meta}>
                      {formatDate(appt.timeSlot?.date)} • {appt.timeSlot?.startTime} - {appt.timeSlot?.endTime}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="cash" size={16} color={systemColors.gray} />
                    <Text variant="bodyMedium" style={styles.meta}>
                      {appt.totalAmount.toLocaleString()} VND
                    </Text>
                  </View>

                  {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') ? (
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => void handleCancel(appt.id)}
                      textColor={theme.colors.error}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </View>
              </GlassCard>
            </FadeInView>
          );
        })
      )}

      <Snackbar visible={Boolean(error || notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice || error}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 4,
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.8)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTextActive: {
    color: '#fff',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: systemColors.gray,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  cardContent: {
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardInfo: {
    flex: 1,
  },
  doctorName: {
    fontWeight: '600',
  },
  meta: {
    color: systemColors.gray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 20,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    borderColor: theme.colors.error,
    borderRadius: 10,
  },
});
