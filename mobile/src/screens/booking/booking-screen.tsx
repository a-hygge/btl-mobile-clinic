import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, RadioButton, Snackbar, Text, TextInput } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme, systemColors } from '../../constants/theme';
import { getSpecialties, getClinics } from '../../services/specialties.service';
import {
  createAppointment,
  getAvailableSlots,
  type AvailableSlot,
} from '../../services/appointments.service';
import { createPayment, type CreatePaymentResponse } from '../../services/payment.service';
import type { Specialty, Clinic, Appointment } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

const H_MARGIN = 16;
const SECTION_GAP = 20;
const ELEMENT_GAP = 12;
const FADE_DURATION = 350;
const SLIDE_DISTANCE = 30;

const SPECIALTY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  cardiology: 'heart-pulse',
  dermatology: 'hand-back-right-outline',
  neurology: 'brain',
  pediatrics: 'baby-face-outline',
  orthopedics: 'bone',
  ophthalmology: 'eye-outline',
  dentistry: 'tooth-outline',
  psychiatry: 'head-cog-outline',
  general: 'stethoscope',
};

const SPECIALTY_COLORS: string[] = [
  systemColors.red,
  systemColors.blue,
  systemColors.purple,
  systemColors.orange,
  systemColors.teal,
  systemColors.green,
  systemColors.indigo,
  systemColors.pink,
  systemColors.yellow,
];

function getSpecialtyIcon(name: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SPECIALTY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'stethoscope';
}

function getSpecialtyColor(index: number): string {
  return SPECIALTY_COLORS[index % SPECIALTY_COLORS.length];
}

// ---------------------------------------------------------------------------
// FadeInView — animated section reveal
// ---------------------------------------------------------------------------

interface FadeInViewProps {
  visible: boolean;
  delay?: number;
  children: React.ReactNode;
}

function FadeInView({ visible, delay = 0, children }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(SLIDE_DISTANCE);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_DURATION,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: FADE_DURATION,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, delay, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Section header with step number
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  step: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
}

function SectionHeader({ step, icon, iconColor, title }: SectionHeaderProps) {
  return (
    <View style={sectionHeaderStyles.container}>
      <View style={[sectionHeaderStyles.stepBadge, { backgroundColor: iconColor }]}>
        <Text style={sectionHeaderStyles.stepText}>{step}</Text>
      </View>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <Text style={sectionHeaderStyles.title}>{title}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
});

// ---------------------------------------------------------------------------
// Specialty card (2-column grid)
// ---------------------------------------------------------------------------

interface SpecialtyCardProps {
  specialty: Specialty;
  index: number;
  selected: boolean;
  onPress: () => void;
}

function SpecialtyCard({ specialty, index, selected, onPress }: SpecialtyCardProps) {
  const color = getSpecialtyColor(index);
  const icon = getSpecialtyIcon(specialty.name);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.specialtyCardWrapper}>
      <View
        style={[
          specCardStyles.card,
          selected && { borderColor: color, backgroundColor: color + '10' },
        ]}
      >
        <View style={[specCardStyles.iconCircle, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={[specCardStyles.name, selected && { color }]} numberOfLines={1}>
          {specialty.name}
        </Text>
        {specialty.description ? (
          <Text style={specCardStyles.desc} numberOfLines={2}>
            {specialty.description}
          </Text>
        ) : null}
        {selected && (
          <View style={[specCardStyles.checkBadge, { backgroundColor: color }]}>
            <MaterialCommunityIcons name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const specCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  desc: {
    fontSize: 11,
    color: systemColors.gray,
    lineHeight: 15,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Clinic card
// ---------------------------------------------------------------------------

interface ClinicCardProps {
  clinic: Clinic | null; // null = "Any clinic"
  selected: boolean;
  onPress: () => void;
}

function ClinicCard({ clinic, selected, onPress }: ClinicCardProps) {
  const isAny = !clinic;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View
        style={[
          clinicCardStyles.card,
          selected && {
            borderColor: systemColors.teal,
            backgroundColor: systemColors.teal + '10',
          },
        ]}
      >
        <View
          style={[
            clinicCardStyles.iconCircle,
            { backgroundColor: (isAny ? systemColors.blue : systemColors.teal) + '18' },
          ]}
        >
          <MaterialCommunityIcons
            name={isAny ? 'map-marker-radius-outline' : 'hospital-building'}
            size={22}
            color={isAny ? systemColors.blue : systemColors.teal}
          />
        </View>
        <View style={clinicCardStyles.textCol}>
          <Text
            style={[clinicCardStyles.name, selected && { color: systemColors.teal }]}
            numberOfLines={1}
          >
            {isAny ? 'Any clinic' : clinic.name}
          </Text>
          <Text style={clinicCardStyles.address} numberOfLines={1}>
            {isAny ? 'System will assign the best match' : clinic.address}
          </Text>
        </View>
        {selected && (
          <MaterialCommunityIcons name="check-circle" size={22} color={systemColors.teal} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const clinicCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: systemColors.gray5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  address: {
    fontSize: 12,
    color: systemColors.gray,
    marginTop: 2,
  },
});

// ---------------------------------------------------------------------------
// Time slot card (grid)
// ---------------------------------------------------------------------------

interface SlotCardProps {
  slot: AvailableSlot;
  selected: boolean;
  onPress: () => void;
}

function SlotCard({ slot, selected, onPress }: SlotCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.slotCardWrapper}>
      <View
        style={[
          slotCardStyles.card,
          selected && {
            borderColor: systemColors.green,
            backgroundColor: systemColors.green + '10',
          },
        ]}
      >
        <Text style={[slotCardStyles.time, selected && { color: systemColors.green }]}>
          {slot.startTime}
        </Text>
        <Text style={slotCardStyles.dash}>-</Text>
        <Text style={[slotCardStyles.endTime, selected && { color: systemColors.green }]}>
          {slot.endTime}
        </Text>
        <View style={slotCardStyles.availBadge}>
          <Text style={slotCardStyles.availText}>{slot.availableCount} avail.</Text>
        </View>
        {selected && (
          <View style={slotCardStyles.checkDot}>
            <MaterialCommunityIcons name="check" size={10} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const slotCardStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
    paddingHorizontal: 8,
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
// Summary row
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
    paddingVertical: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Payment method option
// ---------------------------------------------------------------------------

type PaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

interface PaymentMethodInfo {
  value: PaymentMethod;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  desc: string;
}

const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    value: 'CASH',
    label: 'Cash',
    icon: 'cash',
    color: systemColors.green,
    desc: 'Pay at the clinic',
  },
  {
    value: 'VNPAY',
    label: 'VNPAY',
    icon: 'bank-outline',
    color: systemColors.blue,
    desc: 'Online banking via VNPAY',
  },
  {
    value: 'MOMO',
    label: 'Momo',
    icon: 'wallet-outline',
    color: systemColors.pink,
    desc: 'Pay with Momo e-wallet',
  },
];

// ---------------------------------------------------------------------------
// Success result type
// ---------------------------------------------------------------------------

interface BookingResult {
  appointment: Appointment;
  payment: CreatePaymentResponse | null;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function BookingScreen() {
  const insets = useSafeAreaInsets();
  const { specialtyId } = useLocalSearchParams<{ specialtyId?: string }>();
  const scrollRef = useRef<ScrollView>(null);

  // --- Data state ---
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // --- Selection state ---
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(specialtyId ?? '');
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [dateObj, setDateObj] = useState(new Date());
  const [date, setDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // --- UI state ---
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // --- Load initial data ---
  useEffect(() => {
    Promise.all([getSpecialties(), getClinics()])
      .then(([specs, cls]) => {
        setSpecialties(specs);
        setClinics(cls);
      })
      .catch(() => setNotice('Could not load data. Please try again.'))
      .finally(() => setInitialLoading(false));
  }, []);

  // --- Auto-select specialty from route params ---
  useEffect(() => {
    if (specialtyId && specialties.length > 0) {
      const match = specialties.find((s) => s.id === specialtyId);
      if (match) {
        setSelectedSpecialty(match.id);
      }
    }
  }, [specialtyId, specialties]);

  // --- Load slots when specialty + date change ---
  const loadSlots = useCallback(async () => {
    if (!selectedSpecialty || !date) return;
    setSlotsLoading(true);
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
      setSlotsLoading(false);
    }
  }, [selectedSpecialty, selectedClinic, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  // --- Date picker handler ---
  function onDateChange(_event: unknown, selectedDate?: Date) {
    if (selectedDate) {
      setDateObj(selectedDate);
      setDate(selectedDate.toISOString().slice(0, 10));
    }
  }

  // --- Book + Pay ---
  async function handleConfirm(): Promise<void> {
    if (!selectedSpecialty || !selectedTime) {
      setNotice('Please select a specialty and time slot.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create appointment
      const appointment = await createAppointment({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
        startTime: selectedTime,
        serviceIds: [],
        notes: notes.trim() || undefined,
      });

      // 2. Create payment
      let payment: CreatePaymentResponse | null = null;
      try {
        payment = await createPayment({
          appointmentId: appointment.id,
          method: paymentMethod,
        });
      } catch {
        // Payment creation failed, but appointment was created
      }

      setBookingResult({ appointment, payment });
      setShowSuccess(true);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // --- Derived ---
  const selectedSpecObj = specialties.find((s) => s.id === selectedSpecialty);
  const selectedClinicObj = clinics.find((c) => c.id === selectedClinic);
  const selectedSlot = slots.find((s) => s.startTime === selectedTime);
  const estimatedFee = '150,000 VND'; // placeholder — real value would come from doctor/service

  const showClinic = Boolean(selectedSpecialty);
  const showDate = Boolean(selectedSpecialty);
  const showSlots = Boolean(selectedSpecialty && date);
  const showReview = Boolean(selectedTime);

  // --- Render ---
  if (initialLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <LottieView
          source={require('../../assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 120, height: 120 }}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScreenBackground>
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={systemColors.blue} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text variant="headlineSmall" style={styles.title}>
              Book Appointment
            </Text>
            <Text style={styles.subtitle}>Complete each step to schedule your visit</Text>
          </View>
        </View>

        {/* Step 1: Specialty Selection */}
        <FadeInView visible delay={0}>
          <SectionHeader
            step={1}
            icon="stethoscope"
            iconColor={systemColors.blue}
            title="Select Specialty"
          />
          <View style={styles.specialtyGrid}>
            {specialties.map((spec, i) => (
              <SpecialtyCard
                key={spec.id}
                specialty={spec}
                index={i}
                selected={selectedSpecialty === spec.id}
                onPress={() => {
                  setSelectedSpecialty(spec.id);
                  setSelectedTime('');
                }}
              />
            ))}
          </View>
        </FadeInView>

        {/* Step 2: Clinic Selection */}
        <FadeInView visible={showClinic} delay={100}>
          <SectionHeader
            step={2}
            icon="hospital-building"
            iconColor={systemColors.teal}
            title="Choose Clinic"
          />
          <View style={styles.clinicList}>
            <ClinicCard
              clinic={null}
              selected={selectedClinic === ''}
              onPress={() => setSelectedClinic('')}
            />
            {clinics.map((clinic) => (
              <ClinicCard
                key={clinic.id}
                clinic={clinic}
                selected={selectedClinic === clinic.id}
                onPress={() => setSelectedClinic(clinic.id)}
              />
            ))}
          </View>
        </FadeInView>

        {/* Step 3: Date Selection */}
        <FadeInView visible={showDate} delay={200}>
          <SectionHeader
            step={3}
            icon="calendar"
            iconColor={systemColors.orange}
            title="Pick a Date"
          />
          <GlassCard style={styles.card} glassStyle="regular">
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              onChange={onDateChange}
              themeVariant="light"
            />
          </GlassCard>
        </FadeInView>

        {/* Step 4: Time Slot Selection */}
        <FadeInView visible={showSlots} delay={300}>
          <SectionHeader
            step={4}
            icon="clock-outline"
            iconColor={systemColors.indigo}
            title="Select Time Slot"
          />
          {slotsLoading ? (
            <View style={styles.slotsLoadingContainer}>
              <LottieView
                source={require('../../assets/animations/loading.json')}
                autoPlay
                loop
                style={{ width: 80, height: 80 }}
              />
              <Text style={styles.loadingText}>Finding available slots...</Text>
            </View>
          ) : slots.length > 0 ? (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <SlotCard
                  key={slot.startTime}
                  slot={slot}
                  selected={selectedTime === slot.startTime}
                  onPress={() => setSelectedTime(slot.startTime)}
                />
              ))}
            </View>
          ) : (
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="calendar-remove"
                  size={40}
                  color={systemColors.gray3}
                />
                <Text style={styles.emptyText}>
                  No slots available for this date.
                </Text>
                <Text style={styles.emptyHint}>
                  Try selecting a different date or clinic.
                </Text>
              </View>
            </GlassCard>
          )}
        </FadeInView>

        {/* Step 5: Notes */}
        <FadeInView visible={showReview} delay={100}>
          <SectionHeader
            step={5}
            icon="text-box-outline"
            iconColor={systemColors.purple}
            title="Notes (Optional)"
          />
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Describe your symptoms or add any notes for the doctor..."
            value={notes}
            onChangeText={setNotes}
            outlineColor={systemColors.gray4}
            activeOutlineColor={systemColors.purple}
            outlineStyle={{ borderRadius: 14 }}
            style={styles.notesInput}
          />
        </FadeInView>

        {/* Step 6: Review & Payment */}
        <FadeInView visible={showReview} delay={200}>
          <SectionHeader
            step={6}
            icon="check-decagram"
            iconColor={systemColors.green}
            title="Review & Payment"
          />
          <GlassCard style={styles.card} glassStyle="regular">
            {/* Summary */}
            <View style={styles.summaryCard}>
              <SummaryRow
                icon="stethoscope"
                iconColor={systemColors.blue}
                label="Specialty"
                value={selectedSpecObj?.name ?? '--'}
              />
              <View style={styles.divider} />
              <SummaryRow
                icon="hospital-building"
                iconColor={systemColors.teal}
                label="Clinic"
                value={selectedClinicObj?.name ?? 'Any clinic'}
              />
              <View style={styles.divider} />
              <SummaryRow
                icon="calendar"
                iconColor={systemColors.orange}
                label="Date"
                value={formatDate(date)}
              />
              <View style={styles.divider} />
              <SummaryRow
                icon="clock-outline"
                iconColor={systemColors.indigo}
                label="Time"
                value={
                  selectedSlot
                    ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                    : selectedTime
                }
              />
              <View style={styles.divider} />
              <SummaryRow
                icon="cash"
                iconColor={systemColors.green}
                label="Estimated Fee"
                value={estimatedFee}
              />
            </View>

            {/* Payment method */}
            <Text style={styles.paymentTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {PAYMENT_METHODS.map((method) => (
                <Pressable
                  key={method.value}
                  onPress={() => setPaymentMethod(method.value)}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.value && {
                      borderColor: method.color,
                      backgroundColor: method.color + '08',
                    },
                  ]}
                >
                  <View style={styles.paymentOptionRow}>
                    <View
                      style={[
                        styles.paymentIconCircle,
                        { backgroundColor: method.color + '18' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={method.icon}
                        size={20}
                        color={method.color}
                      />
                    </View>
                    <View style={styles.paymentTextCol}>
                      <Text style={styles.paymentLabel}>{method.label}</Text>
                      <Text style={styles.paymentDesc}>{method.desc}</Text>
                    </View>
                    <RadioButton
                      value={method.value}
                      status={paymentMethod === method.value ? 'checked' : 'unchecked'}
                      onPress={() => setPaymentMethod(method.value)}
                      color={method.color}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Confirm button */}
            <Button
              mode="contained"
              onPress={handleConfirm}
              loading={submitting}
              disabled={submitting}
              icon="check-circle"
              buttonColor={systemColors.green}
              textColor="#fff"
              contentStyle={styles.confirmBtnContent}
              labelStyle={styles.confirmBtnLabel}
              style={styles.confirmBtn}
            >
              {submitting ? 'Booking...' : 'Confirm & Pay'}
            </Button>
          </GlassCard>
        </FadeInView>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent statusBarTranslucent>
        <View style={successStyles.backdrop}>
          <View style={successStyles.card}>
            <LottieView
              source={require('../../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={successStyles.lottie}
            />
            <Text style={successStyles.title}>Appointment Booked!</Text>
            <Text style={successStyles.subtitle}>
              Your appointment has been confirmed successfully.
            </Text>

            {bookingResult?.appointment && (
              <View style={successStyles.detailCard}>
                {bookingResult.appointment.doctor && (
                  <SummaryRow
                    icon="doctor"
                    iconColor={systemColors.blue}
                    label="Doctor"
                    value={bookingResult.appointment.doctor.name}
                  />
                )}
                <SummaryRow
                  icon="calendar"
                  iconColor={systemColors.orange}
                  label="Date"
                  value={
                    bookingResult.appointment.timeSlot
                      ? formatDate(bookingResult.appointment.timeSlot.date)
                      : formatDate(date)
                  }
                />
                <SummaryRow
                  icon="clock-outline"
                  iconColor={systemColors.indigo}
                  label="Time"
                  value={
                    bookingResult.appointment.timeSlot
                      ? `${bookingResult.appointment.timeSlot.startTime} - ${bookingResult.appointment.timeSlot.endTime}`
                      : selectedTime
                  }
                />
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => {
                setShowSuccess(false);
                if (bookingResult?.appointment) {
                  router.push(
                    `/appointment-detail?id=${bookingResult.appointment.id}` as never,
                  );
                } else {
                  router.replace('/appointments' as never);
                }
              }}
              icon="eye-outline"
              buttonColor={systemColors.blue}
              textColor="#fff"
              contentStyle={{ paddingVertical: 4 }}
              labelStyle={{ fontWeight: '700', fontSize: 15 }}
              style={{ borderRadius: 14, width: '100%' }}
            >
              View Appointment
            </Button>

            <Button
              mode="text"
              onPress={() => {
                setShowSuccess(false);
                router.replace('/(tabs)/home' as never);
              }}
              textColor={systemColors.gray}
              labelStyle={{ fontSize: 14 }}
              style={{ marginTop: 4 }}
            >
              Back to Home
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice('')}
        duration={3500}
        action={{ label: 'OK', onPress: () => setNotice('') }}
      >
        {notice}
      </Snackbar>
    </View>
    </ScreenBackground>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: H_MARGIN,
    paddingBottom: 120,
    gap: SECTION_GAP,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: systemColors.gray,
    marginTop: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyCardWrapper: {
    width: '48%',
    flexGrow: 1,
  },
  clinicList: {
    gap: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCardWrapper: {
    width: '30%',
    flexGrow: 1,
  },
  slotsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: systemColors.gray,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: systemColors.gray,
  },
  emptyHint: {
    fontSize: 13,
    color: systemColors.gray2,
  },
  notesInput: {
    backgroundColor: '#fff',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: systemColors.gray6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: ELEMENT_GAP,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: systemColors.gray4,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  paymentMethods: {
    gap: 8,
    marginBottom: ELEMENT_GAP,
  },
  paymentOption: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: systemColors.gray5,
    backgroundColor: '#fff',
    padding: 12,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextCol: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  paymentDesc: {
    fontSize: 12,
    color: systemColors.gray,
    marginTop: 1,
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

const successStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: systemColors.gray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: systemColors.gray6,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    marginBottom: 20,
  },
});
