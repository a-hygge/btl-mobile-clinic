import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Chip, Snackbar, Text, TextInput } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
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
const CARD_SLIDE_DISTANCE = 40;
const CARD_ANIM_DURATION = 400;
const STAGGER_DELAY = 120;
const PULSE_DURATION = 1200;
const PROGRESS_ANIM_DURATION = 350;

const PRIMARY = '#007AFF';
const SECONDARY = '#34C759';

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

  const style: Animated.WithAnimatedObject<{ opacity: number; transform: { translateY: number }[] }> = {
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
        useNativeDriver: false, // width interpolation needs JS driver
      }).start();
    });
  }, [currentStep, fillAnims]);

  return (
    <View style={progressStyles.container}>
      {fillAnims.map((anim, i) => {
        const isActive = i < currentStep;
        return (
          <View key={i} style={progressStyles.stepWrapper}>
            {/* Dot */}
            <View
              style={[
                progressStyles.dot,
                isActive ? progressStyles.dotActive : progressStyles.dotInactive,
              ]}
            >
              {isActive ? (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              ) : (
                <Text style={progressStyles.dotText}>{i + 1}</Text>
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                progressStyles.label,
                isActive ? progressStyles.labelActive : progressStyles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {STEP_LABELS[i]}
            </Text>

            {/* Connecting bar (not after last) */}
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
    marginBottom: 8,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: PRIMARY,
  },
  dotInactive: {
    backgroundColor: theme.colors.outline,
  },
  dotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  labelInactive: {
    color: theme.colors.outline,
  },
  barTrack: {
    position: 'absolute',
    top: 11,
    left: '60%',
    right: '-40%',
    height: 3,
    backgroundColor: theme.colors.outline,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 1.5,
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
        colors={[PRIMARY, SECONDARY]}
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

  const handleSuccessFinish = useCallback(() => {
    setShowSuccess(false);
    router.replace('/appointments');
  }, []);

  async function handleBook(): Promise<void> {
    if (!selectedSpecialty || !selectedTime) {
      setNotice('Please select a specialty and time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
        startTime: selectedTime,
        serviceIds: [],
        notes: notes.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // --- Derived values ------------------------------------------------------
  const selectedSpecObj = specialties.find((s) => s.id === selectedSpecialty);

  const showStep2 = Boolean(selectedSpecialty);
  const showStep3 = Boolean(selectedSpecialty);
  const showStep4 = Boolean(selectedSpecialty && date);
  const showStep5 = Boolean(selectedTime);

  // Determine current progress step (1-indexed count of completed steps)
  let currentStep = 0;
  if (selectedSpecialty) currentStep = 1;
  if (selectedSpecialty && selectedClinic !== undefined) currentStep = 2; // clinic is optional so always "done" once step 1 done
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Button icon="arrow-left" mode="text" onPress={() => router.back()}>
            Back
          </Button>
          <Text variant="headlineSmall" style={styles.title}>
            Book appointment
          </Text>
        </View>

        {/* Progress indicator */}
        <ProgressBar currentStep={currentStep} />

        {/* Step 1: Specialty */}
        <Animated.View style={step1Anim}>
          <GlassCard style={styles.card} glassStyle="regular">
            <View style={styles.cardContent}>
              <View style={styles.stepHeader}>
                <MaterialCommunityIcons name="stethoscope" size={20} color={PRIMARY} />
                <Text variant="titleMedium" style={styles.stepTitle}>
                  1. Select specialty
                </Text>
              </View>
              <View style={styles.chipList}>
                {specialties.map((spec) => (
                  <Chip
                    key={spec.id}
                    selected={selectedSpecialty === spec.id}
                    onPress={() => setSelectedSpecialty(spec.id)}
                    style={[
                      styles.chip,
                      selectedSpecialty === spec.id && styles.chipSelected,
                    ]}
                    selectedColor={PRIMARY}
                  >
                    {spec.name}
                  </Chip>
                ))}
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Step 2: Clinic */}
        {showStep2 && (
          <Animated.View style={step2Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardContent}>
                <View style={styles.stepHeader}>
                  <MaterialCommunityIcons name="hospital-building" size={20} color={PRIMARY} />
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    2. Clinic (optional)
                  </Text>
                </View>
                <View style={styles.chipList}>
                  <Chip
                    selected={selectedClinic === ''}
                    onPress={() => setSelectedClinic('')}
                    style={[styles.chip, selectedClinic === '' && styles.chipSelected]}
                    selectedColor={PRIMARY}
                  >
                    Any clinic
                  </Chip>
                  {clinics.map((clinic) => (
                    <Chip
                      key={clinic.id}
                      selected={selectedClinic === clinic.id}
                      onPress={() => setSelectedClinic(clinic.id)}
                      style={[
                        styles.chip,
                        selectedClinic === clinic.id && styles.chipSelected,
                      ]}
                      selectedColor={PRIMARY}
                    >
                      {clinic.name}
                    </Chip>
                  ))}
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 3: Date */}
        {showStep3 && (
          <Animated.View style={step3Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardContent}>
                <View style={styles.stepHeader}>
                  <MaterialCommunityIcons name="calendar" size={20} color={PRIMARY} />
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    3. Select date
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  label="Date (YYYY-MM-DD)"
                  value={date}
                  onChangeText={setDate}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={PRIMARY}
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 4: Time slots */}
        {showStep4 && (
          <Animated.View style={step4Anim}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardContent}>
                <View style={styles.stepHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={PRIMARY} />
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    4. Available time slots
                  </Text>
                </View>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <LottieView
                      source={require('../../assets/animations/loading.json')}
                      autoPlay
                      loop
                      style={styles.loadingLottie}
                    />
                    <Text variant="bodyMedium" style={styles.loadingText}>
                      Finding available slots...
                    </Text>
                  </View>
                ) : slots.length > 0 ? (
                  <View style={styles.chipList}>
                    {slots.map((slot) => (
                      <Chip
                        key={slot.startTime}
                        selected={selectedTime === slot.startTime}
                        onPress={() => setSelectedTime(slot.startTime)}
                        style={[
                          styles.chip,
                          selectedTime === slot.startTime && styles.chipSelected,
                        ]}
                        selectedColor={PRIMARY}
                      >
                        {slot.startTime} - {slot.endTime} ({slot.availableCount} avail.)
                      </Chip>
                    ))}
                  </View>
                ) : (
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No slots available for this date.
                  </Text>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Step 5: Notes + Confirm */}
        {showStep5 && (
          <Animated.View style={step5Anim}>
            <GlassCard style={styles.card} glassStyle="regular" tintColor="#007AFF">
              <View style={styles.cardContent}>
                <View style={styles.stepHeader}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={SECONDARY} />
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    5. Confirm booking
                  </Text>
                </View>

                {/* Summary box */}
                <LinearGradient
                  colors={[`${PRIMARY}15`, `${SECONDARY}15`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.summaryBox}
                >
                  <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="stethoscope" size={16} color={PRIMARY} />
                    <Text variant="bodyMedium" style={styles.summaryText}>
                      {selectedSpecObj?.name}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="calendar" size={16} color={PRIMARY} />
                    <Text variant="bodyMedium" style={styles.summaryText}>
                      {date}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={PRIMARY} />
                    <Text variant="bodyMedium" style={styles.summaryText}>
                      {selectedTime}
                    </Text>
                  </View>
                </LinearGradient>

                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  label="Notes / symptoms (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={PRIMARY}
                />

                {/* Pulsing confirm button */}
                <Animated.View style={pulseStyle}>
                  <Button
                    mode="contained"
                    onPress={handleBook}
                    loading={submitting}
                    disabled={submitting}
                    icon="check-circle"
                    buttonColor={SECONDARY}
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
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    color: PRIMARY,
  },
  card: {
    // GlassCard already provides borderRadius and background
  },
  cardContent: {
    gap: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepTitle: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: `${PRIMARY}20`,
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
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  emptyText: {
    color: theme.colors.onSurface,
    fontStyle: 'italic',
  },
  summaryBox: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    color: PRIMARY,
    fontWeight: '600',
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
