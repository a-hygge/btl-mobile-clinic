import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { theme, systemColors } from '../../constants/theme';
import {
  createPayment,
  type CreatePaymentResponse,
} from '../../services/payment.service';
import { api, extractData } from '../../services/api';
import type { Appointment } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN = systemColors.green;
const GREEN_DARK = '#248A3D';

type PaymentMethodOption = 'CASH' | 'VNPAY' | 'MOMO';

const METHODS: { key: PaymentMethodOption; label: string; icon: string; desc: string }[] = [
  { key: 'CASH', label: 'Cash', icon: 'cash', desc: 'Pay at the clinic' },
  { key: 'VNPAY', label: 'VNPAY', icon: 'credit-card-outline', desc: 'Pay online via VNPAY' },
  { key: 'MOMO', label: 'Momo', icon: 'wallet-outline', desc: 'Pay via Momo wallet' },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function PaymentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Load appointment data
  useEffect(() => {
    if (!appointmentId) return;
    api
      .get(`/appointments/${appointmentId}`)
      .then((res) => setAppointment(extractData<Appointment>(res)))
      .catch(() => setNotice('Could not load appointment details'));
  }, [appointmentId]);

  const handlePay = useCallback(async () => {
    if (!appointmentId) return;
    setSubmitting(true);
    try {
      const result: CreatePaymentResponse = await createPayment({
        appointmentId,
        method: selectedMethod,
      });

      if (selectedMethod === 'CASH') {
        setShowCashConfirm(true);
        // Auto-navigate after 2 seconds
        setTimeout(() => {
          setShowCashConfirm(false);
          setShowSuccess(true);
        }, 2000);
      } else if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setShowWebView(true);
      }
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [appointmentId, selectedMethod]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_RESULT' && data.success) {
        setShowWebView(false);
        setShowSuccess(true);
      } else if (data.type === 'PAYMENT_RESULT' && !data.success) {
        setShowWebView(false);
        setNotice('Payment failed. Please try again.');
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSuccessFinish = useCallback(() => {
    setShowSuccess(false);
    router.replace('/appointments');
  }, []);

  // --- WebView overlay ---
  if (showWebView && paymentUrl) {
    return (
      <View style={styles.root}>
        <View style={styles.webViewHeader}>
          <Button
            icon="close"
            mode="text"
            onPress={() => {
              setShowWebView(false);
              setNotice('Payment cancelled');
            }}
            textColor="#fff"
          >
            Cancel
          </Button>
          <Text style={styles.webViewTitle}>Payment</Text>
          <View style={{ width: 80 }} />
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
        />
      </View>
    );
  }

  // --- Success overlay ---
  if (showSuccess) {
    return <SuccessOverlay onFinish={handleSuccessFinish} />;
  }

  // --- Cash confirmation overlay ---
  if (showCashConfirm) {
    return (
      <View style={styles.cashOverlay}>
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          style={styles.cashGradient}
        >
          <MaterialCommunityIcons name="cash-check" size={80} color="#fff" />
          <Text style={styles.cashTitle}>Pay at Clinic</Text>
          <Text style={styles.cashSubtitle}>
            Please pay {appointment ? formatCurrency(appointment.totalAmount) : ''} when you visit
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScreenBackground>
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <Button icon="arrow-left" mode="text" onPress={() => router.back()} textColor="#fff">
              Back
            </Button>
          </View>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerSubtitle}>Complete your booking</Text>
        </LinearGradient>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Appointment summary */}
          {appointment && (
            <GlassCard style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color={GREEN} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Appointment Summary
                  </Text>
                </View>

                <LinearGradient
                  colors={[`${GREEN}12`, `${GREEN}06`]}
                  style={styles.summaryBox}
                >
                  {appointment.doctor && (
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="doctor" size={16} color={GREEN} />
                      <Text variant="bodyMedium" style={styles.summaryLabel}>Doctor</Text>
                      <Text variant="bodyMedium" style={styles.summaryValue}>
                        {appointment.doctor.name}
                      </Text>
                    </View>
                  )}
                  {appointment.doctor?.specialty && (
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="stethoscope" size={16} color={GREEN} />
                      <Text variant="bodyMedium" style={styles.summaryLabel}>Specialty</Text>
                      <Text variant="bodyMedium" style={styles.summaryValue}>
                        {appointment.doctor.specialty.name}
                      </Text>
                    </View>
                  )}
                  {appointment.timeSlot && (
                    <>
                      <View style={styles.summaryRow}>
                        <MaterialCommunityIcons name="calendar" size={16} color={GREEN} />
                        <Text variant="bodyMedium" style={styles.summaryLabel}>Date</Text>
                        <Text variant="bodyMedium" style={styles.summaryValue}>
                          {appointment.timeSlot.date}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={GREEN} />
                        <Text variant="bodyMedium" style={styles.summaryLabel}>Time</Text>
                        <Text variant="bodyMedium" style={styles.summaryValue}>
                          {appointment.timeSlot.startTime} - {appointment.timeSlot.endTime}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <MaterialCommunityIcons name="currency-usd" size={16} color={GREEN} />
                    <Text variant="bodyMedium" style={styles.summaryLabel}>Total</Text>
                    <Text variant="titleMedium" style={styles.totalValue}>
                      {formatCurrency(appointment.totalAmount)}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </GlassCard>
          )}

          {/* Payment method selector */}
          <GlassCard style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="credit-card-check-outline" size={20} color={GREEN} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Payment Method
                </Text>
              </View>

              <View style={styles.methodList}>
                {METHODS.map((method) => {
                  const isSelected = selectedMethod === method.key;
                  return (
                    <Pressable
                      key={method.key}
                      onPress={() => setSelectedMethod(method.key)}
                      style={[
                        styles.methodCard,
                        isSelected && styles.methodCardSelected,
                      ]}
                    >
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <MaterialCommunityIcons
                        name={method.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={24}
                        color={isSelected ? GREEN : theme.colors.onSurfaceVariant}
                      />
                      <View style={styles.methodInfo}>
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.methodLabel,
                            isSelected && { color: GREEN, fontWeight: '700' },
                          ]}
                        >
                          {method.label}
                        </Text>
                        <Text variant="bodySmall" style={styles.methodDesc}>
                          {method.desc}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </GlassCard>

          {/* Pay button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handlePay}
              loading={submitting}
              disabled={submitting || !appointment}
              icon={selectedMethod === 'CASH' ? 'cash' : 'credit-card-check'}
              buttonColor={GREEN}
              textColor="#fff"
              contentStyle={styles.payButtonContent}
              labelStyle={styles.payButtonLabel}
              style={styles.payButton}
            >
              {selectedMethod === 'CASH'
                ? 'Confirm - Pay at Clinic'
                : `Pay ${appointment ? formatCurrency(appointment.totalAmount) : ''}`}
            </Button>
          </View>
        </Animated.View>
      </ScrollView>

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </View>
    </ScreenBackground>
  );
}

// ---------------------------------------------------------------------------
// Success overlay
// ---------------------------------------------------------------------------

function SuccessOverlay({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    }, 2500);

    return () => clearTimeout(timer);
  }, [opacity, onFinish]);

  return (
    <Animated.View style={[styles.successOverlay, { opacity }]}>
      <LinearGradient
        colors={[GREEN, GREEN_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.successGradient}
      >
        <LottieView
          source={require('../../assets/animations/success.json')}
          autoPlay
          loop={false}
          style={styles.successLottie}
        />
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>Redirecting to appointments...</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 20,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardContent: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  summaryBox: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  summaryValue: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: `${GREEN}30`,
    paddingTop: 10,
    marginTop: 4,
  },
  totalValue: {
    color: GREEN,
    fontWeight: '800',
  },
  methodList: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  methodCardSelected: {
    borderColor: GREEN,
    backgroundColor: `${GREEN}08`,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: GREEN,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  methodDesc: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  payButton: {
    borderRadius: 14,
  },
  payButtonContent: {
    paddingVertical: 8,
  },
  payButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  // WebView
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 8,
    backgroundColor: GREEN,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  webView: {
    flex: 1,
  },
  // Cash overlay
  cashOverlay: {
    flex: 1,
  },
  cashGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  cashTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  cashSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  successGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successLottie: {
    width: 180,
    height: 180,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
});
