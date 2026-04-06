import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, systemColors } from '../../constants/theme';
import { getSpecialties, getClinics } from '../../services/specialties.service';
import {
  createAppointment,
  getAvailableSlots,
  type AvailableSlot,
} from '../../services/appointments.service';
import type { Specialty, Clinic } from '../../types';

// ---------------------------------------------------------------------------
// Helpers (unchanged business logic)
// ---------------------------------------------------------------------------

function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_COUNT = 5;
const STEP_LABELS: string[] = ['Specialty', 'Clinic', 'Date', 'Slots', 'Confirm'];
const STEP_ICONS: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  'stethoscope',
  'hospital-building',
  'calendar',
  'clock-outline',
  'check-decagram',
];
const CARD_SLIDE_DISTANCE = 40;
const CARD_ANIM_DURATION = 400;
const STAGGER_DELAY = 120;
const PULSE_DURATION = 1200;
const PROGRESS_ANIM_DURATION = 350;

const H_MARGIN = 16;
const SECTION_GAP = 24;
const ELEMENT_GAP = 12;

// ---------------------------------------------------------------------------
// Animated step-card hook — fade-in + slide-up
// ---------------------------------------------------------------------------

function useStepAnimation(visible: boolean, delay: number = 0) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: CARD_ANIM_DURATION,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, delay, anim]);

  const style: Animated.WithAnimatedObject<{
    opacity: number;
    transform: { translateY: number }[];
  }> = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [CARD_SLIDE_DISTANCE, 0],
        }),
      },
    ],
  };

  return style;
}

// ---------------------------------------------------------------------------
// Pulse animation hook for the confirm button
// ---------------------------------------------------------------------------

function usePulseAnimation(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: PULSE_DURATION / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current = pulse;
      pulse.start();
    } else {
      loopRef.current?.stop();
      scale.setValue(1);
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active, scale]);

  return { transform: [{ scale }] };
}

// ---------------------------------------------------------------------------
// Progress indicator component
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  currentStep: number;
}

function ProgressBar({ currentStep }: ProgressBarProps) {
  const fillAnims = useRef<Animated.Value[]>(
    Array.from({ length: STEP_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    fillAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i < currentStep ? 1 : 0,
        duration: PROGRESS_ANIM_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [currentStep, fillAnims]);

  return (
    <View style={progressStyles.container}>
      {fillAnims.map((anim, i) => {
        const isActive = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <View key={i} style={progressStyles.stepWrapper}>
            <View
              style={[
                progressStyles.dot,
                isActive
                  ? progressStyles.dotActive
                  : isCurrent
                    ? progressStyles.dotCurrent
                    : progressStyles.dotInactive,
              ]}
            >
              {isActive ? (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name={STEP_ICONS[i]}
                  size={13}
                  color={isCurrent ? systemColors.blue : '#fff'}
                />
              )}
            </View>

            <Text
              style={[
                progressStyles.label,
                isActive
                  ? progressStyles.labelActive
                  : isCurrent
                    ? progressStyles.labelCurrent
                    : progressStyles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {STEP_LABELS[i]}
            </Text>

            {i < STEP_COUNT - 1 && (
              <View style={progressStyles.barTrack}>
                <Animated.View
                  style={[
                    progressStyles.barFill,
                    {
                      width: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: systemColors.blue,
  },
  dotCurrent: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: systemColors.blue,
  },
  dotInactive: {
    backgroundColor: systemColors.gray3,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
  labelActive: {
    color: systemColors.blue,
    fontWeight: '600',
  },
  labelCurrent: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  labelInactive: {
    color: systemColors.gray,
  },
  barTrack: {
    position: 'absolute',
    top: 12,
    left: '60%',
    right: '-40%',
    height: 3,
    backgroundColor: systemColors.gray4,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: systemColors.blue,
    borderRadius: 1.5,
  },
});

// ---------------------------------------------------------------------------
// Selectable chip component — bigger tap targets
// ---------------------------------------------------------------------------

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  subtitle?: string;
}

function SelectableChip({
  label,
  selected,
  onPress,
  icon,
  iconColor = systemColors.blue,
  subtitle,
}: SelectableChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[chipStyles.chip, selected && chipStyles.chipSelected]}
    >
      {icon && (
        <View style={[chipStyles.iconCircle, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
        </View>
      )}
      <View style={subtitle ? chipStyles.textCol : undefined}>
        <Text
          style={[chipStyles.label, selected && chipStyles.labelSelected]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={chipStyles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: systemColors.gray4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipSelected: {
    borderColor: systemColors.blue,
    backgroundColor: systemColors.blue + '10',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flexShrink: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  labelSelected: {
    color: systemColors.blue,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: systemColors.gray,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Slot chip — taller with time + availability subtitle
// ---------------------------------------------------------------------------

interface SlotChipProps {
  slot: AvailableSlot;
  selected: boolean;
  onPress: () => void;
}

function SlotChip({ slot, selected, onPress }: SlotChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[slotChipStyles.chip, selected && slotChipStyles.chipSelected]}
    >
      <Text style={[slotChipStyles.time, selected && slotChipStyles.timeSelected]}>
        {slot.startTime} - {slot.endTime}
      </Text>
      <Text style={slotChipStyles.avail}>
        {slot.availableCount} available
      </Text>
    </TouchableOpacity>
  );
}

const slotChipStyles = StyleSheet.create({
  chip: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: systemColors.gray4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipSelected: {
    borderColor: systemColors.green,
    backgroundColor: systemColors.green + '10',
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  timeSelected: {
    color: systemColors.green,
  },
  avail: {
    fontSize: 11,
    color: systemColors.gray,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Success overlay component
// ---------------------------------------------------------------------------

interface SuccessOverlayProps {
  visible: boolean;
  onFinish: () => void;
}

function SuccessOverlay({ visible, onFinish }: SuccessOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onFinish());
      }, 2200);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, opacity, onFinish]);

  if (!visible) return null;

  return (
    <Animated.View style={[overlayStyles.container, { opacity }]}>
      <LinearGradient
        colors={[systemColors.blue, systemColors.green]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={overlayStyles.gradient}
      >
        <LottieView
          source={require('../../assets/animations/success.json')}
          autoPlay
          loop={false}
          style={overlayStyles.lottie}
        />
        <Text style={overlayStyles.title}>Booking confirmed!</Text>
        <Text style={overlayStyles.subtitle}>Redirecting to your appointments...</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
});

// ---------------------------------------------------------------------------
// Summary row for confirm step
// ---------------------------------------------------------------------------

interface SummaryRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}

function SummaryRow({ icon, iconColor, label, value }: SummaryRowProps) {
  return (
    <View style={summaryStyles.row}>
      <View style={[summaryStyles.iconCircle, { backgroundColor: iconColor + '14' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <View style={summaryStyles.textCol}>
        <Text style={summaryStyles.label}>{label}</Text>
        <Text style={summaryStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: systemColors.gray,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function BookingScreen() {
  // --- State (unchanged) ---------------------------------------------------
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');

  const [date, setDate] = useState(getTodayDate());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

  // --- API calls (unchanged) -----------------------------------------------
  useEffect(() => {
    Promise.all([getSpecialties(), getClinics()])
      .then(([specs, cls]) => {
        setSpecialties(specs);
        setClinics(cls);
      })
      .catch(() => setNotice('Could not load data'));
  }, []);

  const loadSlots = useCallback(async () => {
    if (!selectedSpecialty || !date) return;
    setLoading(true);
    setSelectedTime('');
    try {
      const result = await getAvailableSlots({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
      });
      setSlots(result);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty, selectedClinic, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);

  const handleSuccessFinish = useCallback(() => {
    setShowSuccess(false);
    if (bookedAppointmentId) {
      router.push({ pathname: '/payment', params: { appointmentId: bookedAppointmentId } });
    } else {
      router.replace('/appointments');
    }
  }, [bookedAppointmentId]);

  async function handleBook(): Promise<void> {
    if (!selectedSpecialty || !selectedTime) {
      setNotice('Please select a specialty and time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createAppointment({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
        startTime: selectedTime,
        serviceIds: [],
        notes: notes.trim() || undefined,
      });
      setBookedAppointmentId(result.id);
      setShowSuccess(true);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // --- Derived values ------------------------------------------------------
  const selectedSpecObj = specialties.find((s) => s.id === selectedSpecialty);
  const selectedClinicObj = clinics.find((c) => c.id === selectedClinic);

  const showStep2 = Boolean(selectedSpecialty);
  const showStep3 = Boolean(selectedSpecialty);
  const showStep4 = Boolean(selectedSpecialty && date);
  const showStep5 = Boolean(selectedTime);

  let currentStep = 0;
  if (selectedSpecialty) currentStep = 1;
  if (selectedSpecialty && selectedClinic !== undefined) currentStep = 2;
  if (selectedSpecialty && date) currentStep = 3;
  if (selectedSpecialty && date && selectedTime) currentStep = 4;
  if (showSuccess) currentStep = 5;

  // --- Animations ----------------------------------------------------------
  const step1Anim = useStepAnimation(true, 0);
  const step2Anim = useStepAnimation(showStep2, STAGGER_DELAY);
  const step3Anim = useStepAnimation(showStep3, STAGGER_DELAY * 2);
  const step4Anim = useStepAnimation(showStep4, STAGGER_DELAY * 3);
  const step5Anim = useStepAnimation(showStep5, STAGGER_DELAY * 4);
  const pulseStyle = usePulseAnimation(showStep5 && !submitting);

  // --- Render --------------------------------------------------------------
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={systemColors.blue} />
          </TouchableOpacity>
          <Text variant="headlineSmall" style={styles.title}>
            Book appointment
          </Text>
        </View>

        {/* Progress indicator */}
        <ProgressBar currentStep={currentStep} />

        {/* Step 1: Specialty */}
        <Animated.View style={step1Anim}>
          <GlassCard style={styles.card} glassStyle="regular">
            <View style={styles.cardInner}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIconCircle, { backgroundColor: systemColors.blue + '14' }]}>
                  <MaterialCommunityIcons name="stethoscope" size={18} color={systemColors.blue} />
                </View>
                <Text style={styles.stepTitle}>Select specialty</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {specialties.map((spec) => (
                  <SelectableChip
                    key={spec.id}
                    label={spec.name}
                    selected={selectedSpecialty === spec.id}
                    onPress={() => setSelectedSpecialty(spec.id)}
                    icon="stethoscope"
                    iconColor={systemColors.blue}
                  />
                ))}
              </ScrollView>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Step 2: Clinic */}
        {showStep2 && (
          <Animated.View style={step2Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.stepHeader}>
                  <View
                    style={[styles.stepIconCircle, { backgroundColor: systemColors.teal + '14' }]}
                  >
                    <MaterialCommunityIcons
                      name="hospital-building"
                      size={18}
                      color={systemColors.teal}
                    />
                  </View>
                  <Text style={styles.stepTitle}>Clinic (optional)</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  <SelectableChip
                    label="Any clinic"
                    selected={selectedClinic === ''}
                    onPress={() => setSelectedClinic('')}
                    icon="hospital-building"
                    iconColor={systemColors.teal}
                  />
                  {clinics.map((clinic) => (
                    <SelectableChip
                      key={clinic.id}
                      label={clinic.name}
                      selected={selectedClinic === clinic.id}
                      onPress={() => setSelectedClinic(clinic.id)}
                      icon="hospital-building"
                      iconColor={systemColors.teal}
                    />
                  ))}
                </ScrollView>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 3: Date */}
        {showStep3 && (
          <Animated.View style={step3Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      { backgroundColor: systemColors.orange + '14' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={18}
                      color={systemColors.orange}
                    />
                  </View>
                  <Text style={styles.stepTitle}>Select date</Text>
                </View>
                <View style={styles.dateCard}>
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={22}
                    color={systemColors.orange}
                  />
                  <TextInput
                    mode="outlined"
                    label="Date (YYYY-MM-DD)"
                    value={date}
                    onChangeText={setDate}
                    outlineColor={systemColors.gray4}
                    activeOutlineColor={systemColors.blue}
                    style={styles.dateInput}
                    dense
                  />
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 4: Time slots */}
        {showStep4 && (
          <Animated.View style={step4Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      { backgroundColor: systemColors.indigo + '14' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={18}
                      color={systemColors.indigo}
                    />
                  </View>
                  <Text style={styles.stepTitle}>Available time slots</Text>
                </View>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <LottieView
                      source={require('../../assets/animations/loading.json')}
                      autoPlay
                      loop
                      style={styles.loadingLottie}
                    />
                    <Text style={styles.loadingText}>Finding available slots...</Text>
                  </View>
                ) : slots.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScroll}
                  >
                    {slots.map((slot) => (
                      <SlotChip
                        key={slot.startTime}
                        slot={slot}
                        selected={selectedTime === slot.startTime}
                        onPress={() => setSelectedTime(slot.startTime)}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No slots available for this date.</Text>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 5: Notes + Confirm */}
        {showStep5 && (
          <Animated.View style={step5Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepIconCircle,
                      { backgroundColor: systemColors.green + '14' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={18}
                      color={systemColors.green}
                    />
                  </View>
                  <Text style={styles.stepTitle}>Confirm booking</Text>
                </View>

                {/* Summary card */}
                <View style={styles.summaryCard}>
                  <SummaryRow
                    icon="stethoscope"
                    iconColor={systemColors.blue}
                    label="Specialty"
                    value={selectedSpecObj?.name ?? '—'}
                  />
                  <View style={styles.summaryDivider} />
                  <SummaryRow
                    icon="hospital-building"
                    iconColor={systemColors.teal}
                    label="Clinic"
                    value={selectedClinicObj?.name ?? 'Any clinic'}
                  />
                  <View style={styles.summaryDivider} />
                  <SummaryRow
                    icon="calendar"
                    iconColor={systemColors.orange}
                    label="Date"
                    value={date}
                  />
                  <View style={styles.summaryDivider} />
                  <SummaryRow
                    icon="clock-outline"
                    iconColor={systemColors.indigo}
                    label="Time"
                    value={selectedTime}
                  />
                </View>

                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  label="Notes / symptoms (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  outlineColor={systemColors.gray4}
                  activeOutlineColor={systemColors.blue}
                />

                {/* Pulsing confirm button */}
                <Animated.View style={pulseStyle}>
                  <Button
                    mode="contained"
                    onPress={handleBook}
                    loading={submitting}
                    disabled={submitting}
                    icon="check-circle"
                    buttonColor={systemColors.green}
                    textColor="#fff"
                    contentStyle={styles.confirmButtonContent}
                    labelStyle={styles.confirmButtonLabel}
                    style={styles.confirmButton}
                  >
                    Confirm booking
                  </Button>
                </Animated.View>
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>

      {/* Success overlay */}
      <SuccessOverlay visible={showSuccess} onFinish={handleSuccessFinish} />

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: H_MARGIN,
    paddingTop: 20,
    paddingBottom: 100,
    gap: SECTION_GAP,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardInner: {
    gap: ELEMENT_GAP,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  chipScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: systemColors.gray5,
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingLottie: {
    width: 80,
    height: 80,
  },
  loadingText: {
    fontSize: 14,
    color: systemColors.gray,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: systemColors.gray,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: systemColors.gray6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: systemColors.gray4,
  },
  confirmButton: {
    borderRadius: 14,
    marginTop: 4,
  },
  confirmButtonContent: {
    paddingVertical: 6,
  },
  confirmButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
