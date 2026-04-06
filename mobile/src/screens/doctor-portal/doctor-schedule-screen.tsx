import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, systemColors } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { api, extractData } from '../../services/api';

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
// Types
// ---------------------------------------------------------------------------

interface WorkSchedule {
  id: string;
  date: string;
  shift: 'MORNING' | 'AFTERNOON';
  startTime: string;
  endTime: string;
  isRegistered?: boolean;
}

interface RegisteredShift {
  id: string;
  workScheduleId: string;
  date: string;
  shift: 'MORNING' | 'AFTERNOON';
  startTime: string;
  endTime: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDays(): { label: string; date: string; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const days: { label: string; date: string; isToday: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({
      label: DAY_NAMES[i],
      date: dateStr,
      isToday: dateStr === today.toISOString().slice(0, 10),
    });
  }
  return days;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

// ---------------------------------------------------------------------------
// DoctorScheduleScreen
// ---------------------------------------------------------------------------

export function DoctorScheduleScreen() {
  const insets = useSafeAreaInsets();
  const weekDays = getWeekDays();

  const [selectedDate, setSelectedDate] = useState(
    weekDays.find((d) => d.isToday)?.date ?? weekDays[0].date
  );
  const [registeredShifts, setRegisteredShifts] = useState<RegisteredShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registerLoading, setRegisterLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Available shifts (static — morning/afternoon for each day)
  const availableShifts: WorkSchedule[] = [
    {
      id: `${selectedDate}-morning`,
      date: selectedDate,
      shift: 'MORNING',
      startTime: '08:00',
      endTime: '12:00',
    },
    {
      id: `${selectedDate}-afternoon`,
      date: selectedDate,
      shift: 'AFTERNOON',
      startTime: '13:00',
      endTime: '17:00',
    },
  ];

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await api.get('/schedules/doctor/me');
      const data = extractData<RegisteredShift[]>(res);
      setRegisteredShifts(data);
    } catch {
      // silently handle — may not have schedules yet
      setRegisteredShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  }, [fetchSchedule]);

  const isShiftRegistered = (shift: WorkSchedule): boolean => {
    return registeredShifts.some(
      (s) => s.date?.slice(0, 10) === shift.date && s.shift === shift.shift
    );
  };

  const handleRegister = async (shift: WorkSchedule) => {
    setRegisterLoading(shift.id);
    try {
      await api.post('/schedules/doctor/register', {
        date: shift.date,
        shift: shift.shift,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
      setSnackbar({ visible: true, message: 'Shift registered successfully!' });
      await fetchSchedule();
    } catch (err) {
      setSnackbar({ visible: true, message: getErrorMessage(err) });
    } finally {
      setRegisterLoading(null);
    }
  };

  // -----------------------------------------------------------------------
  // Registered shifts for selected date
  // -----------------------------------------------------------------------

  const shiftsForDate = registeredShifts.filter(
    (s) => s.date?.slice(0, 10) === selectedDate
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <ScreenBackground>
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
            <Text style={styles.heroTitle}>My Schedule</Text>
            <Text style={styles.heroSub}>Register for work shifts</Text>
          </FadeInView>
        </LinearGradient>

        {/* Week Day Selector */}
        <FadeInView delay={100}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekRow}
          >
            {weekDays.map((day) => {
              const isSelected = day.date === selectedDate;
              return (
                <Pressable
                  key={day.date}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text
                    style={[
                      styles.dayPillLabel,
                      isSelected && styles.dayPillLabelSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                  <Text
                    style={[
                      styles.dayPillDate,
                      isSelected && styles.dayPillDateSelected,
                    ]}
                  >
                    {formatDateLabel(day.date)}
                  </Text>
                  {day.isToday && (
                    <View
                      style={[
                        styles.todayDot,
                        isSelected && styles.todayDotSelected,
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </FadeInView>

        {/* Available Shifts */}
        <FadeInView delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Shifts</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <LottieView
                source={require('../../assets/animations/loading.json')}
                autoPlay
                loop
                style={{ width: 80, height: 80 }}
              />
            </View>
          ) : (
            <View style={styles.shiftsList}>
              {availableShifts.map((shift) => {
                const registered = isShiftRegistered(shift);
                const isProcessing = registerLoading === shift.id;
                const isMorning = shift.shift === 'MORNING';

                return (
                  <GlassCard key={shift.id} style={styles.shiftCard}>
                    <View style={styles.shiftRow}>
                      <View
                        style={[
                          styles.shiftIconCircle,
                          {
                            backgroundColor: isMorning ? '#FF950018' : '#5856D618',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isMorning ? 'weather-sunny' : 'weather-sunset'}
                          size={24}
                          color={isMorning ? systemColors.orange : systemColors.indigo}
                        />
                      </View>
                      <View style={styles.shiftInfo}>
                        <Text style={styles.shiftName}>
                          {isMorning ? 'Morning Shift' : 'Afternoon Shift'}
                        </Text>
                        <Text style={styles.shiftTime}>
                          {shift.startTime} - {shift.endTime}
                        </Text>
                      </View>
                      {registered ? (
                        <View style={styles.registeredBadge}>
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={18}
                            color={systemColors.green}
                          />
                          <Text style={styles.registeredText}>Registered</Text>
                        </View>
                      ) : (
                        <Button
                          mode="contained"
                          onPress={() => handleRegister(shift)}
                          loading={isProcessing}
                          disabled={isProcessing}
                          compact
                          buttonColor={systemColors.blue}
                          style={styles.registerBtn}
                          labelStyle={styles.registerBtnLabel}
                        >
                          Register
                        </Button>
                      )}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </FadeInView>

        {/* Registered Shifts for Selected Day */}
        <FadeInView delay={300}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Registered Shifts</Text>
          </View>

          {shiftsForDate.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={40}
                color={systemColors.gray3}
              />
              <Text style={styles.emptyText}>
                No shifts registered for this day
              </Text>
            </View>
          ) : (
            <View style={styles.shiftsList}>
              {shiftsForDate.map((shift) => {
                const isMorning = shift.shift === 'MORNING';
                return (
                  <GlassCard key={shift.id} style={styles.registeredCard}>
                    <View style={styles.shiftRow}>
                      <View
                        style={[
                          styles.shiftIconCircle,
                          {
                            backgroundColor: isMorning ? '#34C75918' : '#34C75918',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={22}
                          color={systemColors.green}
                        />
                      </View>
                      <View style={styles.shiftInfo}>
                        <Text style={styles.shiftName}>
                          {isMorning ? 'Morning Shift' : 'Afternoon Shift'}
                        </Text>
                        <Text style={styles.shiftTime}>
                          {shift.startTime?.slice(0, 5)} - {shift.endTime?.slice(0, 5)}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </FadeInView>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        action={{ label: 'OK', onPress: () => {} }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
    </ScreenBackground>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },

  /* Header */
  hero: {
    paddingBottom: 32,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  /* Week selector */
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
  },
  dayPill: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    minWidth: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dayPillSelected: {
    backgroundColor: systemColors.blue,
  },
  dayPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: systemColors.gray,
    marginBottom: 4,
  },
  dayPillLabelSelected: {
    color: '#fff',
  },
  dayPillDate: {
    fontSize: 12,
    color: systemColors.gray2,
  },
  dayPillDateSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: systemColors.blue,
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: '#fff',
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

  /* Shifts */
  shiftsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  shiftCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  registeredCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shiftIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftInfo: {
    flex: 1,
    gap: 2,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  shiftTime: {
    fontSize: 13,
    color: systemColors.gray,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#34C75918',
  },
  registeredText: {
    fontSize: 12,
    fontWeight: '600',
    color: systemColors.green,
  },
  registerBtn: {
    borderRadius: 10,
  },
  registerBtnLabel: {
    fontSize: 13,
  },

  /* Loading & Empty */
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: systemColors.gray,
  },
});
