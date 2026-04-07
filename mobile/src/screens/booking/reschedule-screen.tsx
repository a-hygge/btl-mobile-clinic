import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  EmptyState,
  FadeInView,
  GradientHeader,
  ScreenContainer,
} from '../../components/shared';
import { systemColors, theme } from '../../constants/theme';
import { api, extractData } from '../../services/api';
import {
  getAvailableSlots,
  rescheduleAppointment,
  type AvailableSlot,
} from '../../services/appointments.service';
import type { Appointment } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(value?: string): string {
  if (!value) return '';
  return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Slot button
// ---------------------------------------------------------------------------

interface SlotButtonProps {
  slot: AvailableSlot;
  selected: boolean;
  onPress: () => void;
}

function SlotButton({ slot, selected, onPress }: SlotButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={slotStyles.wrapper}>
      <View
        style={[
          slotStyles.card,
          selected && {
            borderColor: systemColors.green,
            backgroundColor: systemColors.green + '14',
          },
        ]}
      >
        <Text style={[slotStyles.time, selected && { color: systemColors.green }]}>
          {slot.startTime}
        </Text>
        <Text style={slotStyles.dash}>-</Text>
        <Text style={[slotStyles.endTime, selected && { color: systemColors.green }]}>
          {slot.endTime}
        </Text>
        <View style={slotStyles.availBadge}>
          <Text style={slotStyles.availText}>{slot.availableCount} avail.</Text>
        </View>
        {selected && (
          <View style={slotStyles.checkDot}>
            <MaterialCommunityIcons name="check" size={10} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const slotStyles = StyleSheet.create({
  wrapper: {
    width: '31%',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: systemColors.gray5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  dash: {
    fontSize: 11,
    color: systemColors.gray2,
    marginVertical: 1,
  },
  endTime: {
    fontSize: 13,
    fontWeight: '500',
    color: systemColors.gray,
  },
  availBadge: {
    marginTop: 6,
    backgroundColor: systemColors.gray6,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  availText: {
    fontSize: 10,
    fontWeight: '600',
    color: systemColors.gray,
  },
  checkDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: systemColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

interface RescheduleScreenProps {
  appointmentId: string;
}

export function RescheduleScreen({ appointmentId }: RescheduleScreenProps) {
  const insets = useSafeAreaInsets();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(getTodayDate());
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState('');

  // Button press animation
  const [buttonScale] = useState(() => new Animated.Value(1));

  // Load appointment
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await extractData<Appointment>(
          await api.get(`/appointments/${appointmentId}`)
        );
        if (!mounted) return;
        setAppointment(data);
        // Default picker date to today (or current appt date if in future)
        const apptDate = data.timeSlot?.date;
        if (apptDate) {
          const d = new Date(apptDate + 'T00:00:00');
          if (d.getTime() >= new Date(getTodayDate() + 'T00:00:00').getTime()) {
            setPickerDate(d);
            setDate(toDateOnly(d));
          }
        }
      } catch {
        if (mounted) setNotice('Could not load appointment.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  // Load slots when date or appointment changes
  const loadSlots = useCallback(async () => {
    if (!appointment?.doctor?.specialty?.id) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const data = await getAvailableSlots({
        specialtyId: appointment.doctor.specialty.id,
        clinicId: appointment.doctor.clinic?.id,
        date,
      });
      setSlots(data);
    } catch {
      setSlots([]);
      setNotice('Could not load slots for this date.');
    } finally {
      setSlotsLoading(false);
    }
  }, [appointment, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function handleDateChange(_: unknown, picked?: Date) {
    if (picked) {
      setPickerDate(picked);
      setDate(toDateOnly(picked));
    }
  }

  function pressInButton() {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  }

  function pressOutButton() {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  }

  async function handleConfirm() {
    if (!selectedSlot) {
      setNotice('Please pick a time slot first.');
      return;
    }
    setSubmitting(true);
    try {
      await rescheduleAppointment(appointmentId, {
        date,
        startTime: selectedSlot.startTime,
      });
      setSuccess(true);
      setTimeout(() => {
        router.back();
      }, 1400);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not reschedule appointment.';
      setNotice(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator size="large" color={systemColors.blue} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
        <EmptyState
          icon="alert-circle-outline"
          title="Appointment not found"
          message="We could not load this appointment."
          action={{ label: 'Go back', onPress: () => router.back() }}
        />
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 80 }]}>
        <LottieView
          source={require('../../assets/animations/success.json')}
          autoPlay
          loop={false}
          style={styles.successLottie}
        />
        <Text style={styles.successText}>Appointment Rescheduled</Text>
        <Text style={styles.successSub}>
          {formatLongDate(date)} at {selectedSlot?.startTime}
        </Text>
      </View>
    );
  }

  const doctor = appointment.doctor;
  const currentSlot = appointment.timeSlot;
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);

  return (
    <>
      <ScreenContainer showsVerticalScrollIndicator={false}>
        <GradientHeader
          title="Reschedule"
          subtitle="Pick a new date and time"
          colors={[systemColors.purple, '#5E2BFF']}
          leftSlot={
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
          }
        />

        <View style={styles.body}>
          {/* Current appointment card */}
          <FadeInView delay={0}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={18}
                    color={systemColors.blue}
                  />
                  <Text style={styles.sectionTitle}>Current Appointment</Text>
                </View>
                {doctor && (
                  <View style={styles.row}>
                    <MaterialCommunityIcons
                      name="doctor"
                      size={16}
                      color={systemColors.blue}
                    />
                    <Text style={styles.rowText}>
                      {doctor.name}
                      {doctor.specialty?.name ? `  -  ${doctor.specialty.name}` : ''}
                    </Text>
                  </View>
                )}
                {currentSlot && (
                  <>
                    <View style={styles.row}>
                      <MaterialCommunityIcons
                        name="calendar"
                        size={16}
                        color={systemColors.orange}
                      />
                      <Text style={styles.rowText}>{formatLongDate(currentSlot.date)}</Text>
                    </View>
                    <View style={styles.row}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color={systemColors.indigo}
                      />
                      <Text style={styles.rowText}>
                        {currentSlot.startTime} - {currentSlot.endTime}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </GlassCard>
          </FadeInView>

          {/* Date picker */}
          <FadeInView delay={80}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={18}
                    color={systemColors.purple}
                  />
                  <Text style={styles.sectionTitle}>Pick a new date</Text>
                </View>
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display="inline"
                    minimumDate={minDate}
                    maximumDate={maxDate}
                    onChange={handleDateChange}
                    accentColor={systemColors.purple}
                  />
                </View>
                <Text style={styles.dateLabel}>{formatLongDate(date)}</Text>
              </View>
            </GlassCard>
          </FadeInView>

          {/* Slots */}
          <FadeInView delay={160}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="clock-time-four-outline"
                    size={18}
                    color={systemColors.green}
                  />
                  <Text style={styles.sectionTitle}>Available time slots</Text>
                </View>

                {slotsLoading ? (
                  <View style={styles.slotsLoading}>
                    <ActivityIndicator color={systemColors.green} />
                  </View>
                ) : slots.length === 0 ? (
                  <View style={styles.slotsEmpty}>
                    <MaterialCommunityIcons
                      name="calendar-remove-outline"
                      size={40}
                      color={systemColors.gray3}
                    />
                    <Text style={styles.emptyText}>No slots available for this date</Text>
                  </View>
                ) : (
                  <View style={styles.slotsGrid}>
                    {slots.map((slot, i) => (
                      <FadeInView key={`${slot.startTime}-${slot.endTime}`} delay={i * 40}>
                        <SlotButton
                          slot={slot}
                          selected={
                            selectedSlot?.startTime === slot.startTime &&
                            selectedSlot?.endTime === slot.endTime
                          }
                          onPress={() => setSelectedSlot(slot)}
                        />
                      </FadeInView>
                    ))}
                  </View>
                )}
              </View>
            </GlassCard>
          </FadeInView>

          {/* Confirm button */}
          <FadeInView delay={240}>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Button
                mode="contained"
                onPress={handleConfirm}
                onPressIn={pressInButton}
                onPressOut={pressOutButton}
                loading={submitting}
                disabled={submitting || !selectedSlot}
                buttonColor={systemColors.purple}
                textColor="#fff"
                icon="calendar-check"
                style={styles.confirmBtn}
                contentStyle={styles.confirmBtnContent}
                labelStyle={styles.confirmBtnLabel}
              >
                Confirm Reschedule
              </Button>
            </Animated.View>
          </FadeInView>
        </View>
      </ScreenContainer>

      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice('')}
        duration={3000}
      >
        {notice}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successLottie: {
    width: 180,
    height: 180,
  },
  successText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 12,
  },
  successSub: {
    fontSize: 14,
    color: systemColors.gray,
    marginTop: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    gap: 14,
    marginTop: 16,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardInner: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  rowText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  pickerWrap: {
    marginHorizontal: -8,
  },
  dateLabel: {
    fontSize: 13,
    color: systemColors.gray,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotsLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  slotsEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: systemColors.gray,
  },
  confirmBtn: {
    borderRadius: 14,
    marginTop: 4,
  },
  confirmBtnContent: {
    paddingVertical: 6,
  },
  confirmBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
