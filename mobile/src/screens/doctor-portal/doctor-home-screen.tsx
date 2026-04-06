import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { theme, systemColors } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { api, extractPaginatedData } from '../../services/api';
import type { Appointment } from '../../types';

// ---------------------------------------------------------------------------
// FadeInView
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(t?: string): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: systemColors.orange, bg: '#FF950018', label: 'Pending' },
  CONFIRMED: { color: systemColors.blue, bg: '#007AFF18', label: 'Confirmed' },
  COMPLETED: { color: systemColors.green, bg: '#34C75918', label: 'Completed' },
  CANCELED: { color: systemColors.red, bg: '#FF3B3018', label: 'Canceled' },
};

// ---------------------------------------------------------------------------
// DoctorHomeScreen
// ---------------------------------------------------------------------------

export function DoctorHomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/appointments/me', {
        params: { limit: 50, sort: 'date', order: 'asc' },
      });
      const { data } = extractPaginatedData<Appointment[]>(res);
      setAppointments(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchAppointments]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      await api.put(`/appointments/${id}/confirm`);
      await fetchAppointments();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id);
    try {
      await api.put(`/appointments/${id}/complete`, {
        diagnosis: diagnosisInput || undefined,
      });
      setDiagnosisInput('');
      setExpandedId(null);
      await fetchAppointments();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  };

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  const todayAppointments = appointments.filter(
    (a) => isToday(a.timeSlot?.date) && a.status !== 'CANCELED'
  );
  const todayCompleted = todayAppointments.filter((a) => a.status === 'COMPLETED').length;
  const todayPending = todayAppointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  ).length;

  const greeting = getGreeting();

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const isExpanded = expandedId === item.id;
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
    const patientName = item.patient?.name ?? 'Patient';
    const slotStart = formatTime(item.timeSlot?.startTime);
    const slotEnd = formatTime(item.timeSlot?.endTime);
    const isProcessing = actionLoading === item.id;

    return (
      <FadeInView delay={0}>
        <Pressable onPress={() => setExpandedId(isExpanded ? null : item.id)}>
          <GlassCard style={styles.appointmentCard}>
            {/* Main row */}
            <View style={styles.cardRow}>
              <View style={[styles.avatarCircle, { backgroundColor: status.bg }]}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color={status.color}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.patientName} numberOfLines={1}>
                  {patientName}
                </Text>
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={13}
                    color={systemColors.gray}
                  />
                  <Text style={styles.timeText}>
                    {slotStart}{slotEnd ? ` - ${slotEnd}` : ''}
                  </Text>
                </View>
                {item.notes ? (
                  <Text style={styles.notesPreview} numberOfLines={1}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={systemColors.gray3}
                />
              </View>
            </View>

            {/* Expanded details */}
            {isExpanded && (
              <View style={styles.expandedSection}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={14}
                    color={systemColors.gray}
                  />
                  <Text style={styles.detailText}>
                    {item.patient?.email ?? 'N/A'}
                  </Text>
                </View>
                {item.patient?.phone ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="phone-outline"
                      size={14}
                      color={systemColors.gray}
                    />
                    <Text style={styles.detailText}>{item.patient.phone}</Text>
                  </View>
                ) : null}
                {item.notes ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="note-text-outline"
                      size={14}
                      color={systemColors.gray}
                    />
                    <Text style={styles.detailText}>{item.notes}</Text>
                  </View>
                ) : null}
                {item.diagnosis ? (
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons
                      name="stethoscope"
                      size={14}
                      color={systemColors.green}
                    />
                    <Text style={[styles.detailText, { color: systemColors.green }]}>
                      {item.diagnosis}
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                {item.status === 'PENDING' && (
                  <Button
                    mode="contained"
                    onPress={() => handleConfirm(item.id)}
                    loading={isProcessing}
                    disabled={isProcessing}
                    style={styles.actionButton}
                    buttonColor={systemColors.blue}
                    icon="check"
                  >
                    Confirm Appointment
                  </Button>
                )}

                {item.status === 'CONFIRMED' && (
                  <View style={styles.completeSection}>
                    <TextInput
                      mode="outlined"
                      label="Diagnosis (optional)"
                      value={diagnosisInput}
                      onChangeText={setDiagnosisInput}
                      style={styles.diagnosisInput}
                      outlineColor={systemColors.gray4}
                      activeOutlineColor={systemColors.blue}
                      multiline
                      numberOfLines={2}
                    />
                    <Button
                      mode="contained"
                      onPress={() => handleComplete(item.id)}
                      loading={isProcessing}
                      disabled={isProcessing}
                      style={styles.actionButton}
                      buttonColor={systemColors.green}
                      icon="check-circle"
                    >
                      Mark as Completed
                    </Button>
                  </View>
                )}
              </View>
            )}
          </GlassCard>
        </Pressable>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={['#5AC8FA', '#007AFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <FadeInView delay={0}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.heroName}>Dr. {user?.name ?? 'Doctor'}</Text>
            <Text style={styles.heroSub}>Welcome back</Text>
          </FadeInView>
        </LinearGradient>

        {/* Today's Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#5AC8FA18' }]}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={systemColors.teal}
                />
              </View>
              <Text style={styles.statValue}>{todayAppointments.length}</Text>
              <Text style={styles.statLabel}>Today's Patients</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#34C75918' }]}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={systemColors.green}
                />
              </View>
              <Text style={styles.statValue}>{todayCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </GlassCard>

            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FF950018' }]}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={systemColors.orange}
                />
              </View>
              <Text style={styles.statValue}>{todayPending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </GlassCard>
          </View>
        </FadeInView>

        {/* Quick Actions */}
        <FadeInView delay={200}>
          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push('/appointments' as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#007AFF18' }]}>
                <MaterialCommunityIcons
                  name="calendar-text"
                  size={22}
                  color={systemColors.blue}
                />
              </View>
              <Text style={styles.quickActionLabel}>All Appointments</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => router.push('/doctor-schedule' as never)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#5856D618' }]}>
                <MaterialCommunityIcons
                  name="calendar-edit"
                  size={22}
                  color={systemColors.indigo}
                />
              </View>
              <Text style={styles.quickActionLabel}>Manage Schedule</Text>
            </Pressable>
          </View>
        </FadeInView>

        {/* Today's Appointments List */}
        <FadeInView delay={300}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
          </View>
        </FadeInView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <LottieView
              source={require('../../assets/animations/loading.json')}
              autoPlay
              loop
              style={{ width: 100, height: 100 }}
            />
          </View>
        ) : todayAppointments.length === 0 ? (
          <FadeInView delay={400}>
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={48}
                color={systemColors.gray3}
              />
              <Text style={styles.emptyText}>No appointments today</Text>
              <Text style={styles.emptySubText}>
                Enjoy your free time or manage your schedule
              </Text>
            </View>
          </FadeInView>
        ) : (
          <FlatList
            data={todayAppointments}
            keyExtractor={(item) => item.id}
            renderItem={renderAppointmentCard}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },

  /* Header */
  hero: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greeting: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: systemColors.gray,
    textAlign: 'center',
  },

  /* Quick Actions */
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },

  /* Section */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },

  /* Appointment Cards */
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  appointmentCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: systemColors.gray,
  },
  notesPreview: {
    fontSize: 12,
    color: systemColors.gray2,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Expanded */
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: systemColors.gray5,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: systemColors.gray,
    flex: 1,
  },
  completeSection: {
    gap: 10,
    marginTop: 4,
  },
  diagnosisInput: {
    backgroundColor: '#fff',
    fontSize: 14,
  },
  actionButton: {
    borderRadius: 12,
    marginTop: 4,
  },

  /* Empty & Loading */
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: systemColors.gray,
  },
  emptySubText: {
    fontSize: 14,
    color: systemColors.gray2,
    textAlign: 'center',
  },
});
