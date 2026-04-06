import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { theme, systemColors } from '../../constants/theme';
import { api, extractData } from '../../services/api';
import { cancelAppointment } from '../../services/appointments.service';
import type { Appointment, Payment } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    bgColor: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
  }
> = {
  PENDING: {
    color: '#fff',
    bgColor: systemColors.orange,
    icon: 'clock-outline',
    label: 'Pending Confirmation',
  },
  CONFIRMED: {
    color: '#fff',
    bgColor: systemColors.blue,
    icon: 'check-circle-outline',
    label: 'Confirmed',
  },
  COMPLETED: {
    color: '#fff',
    bgColor: systemColors.green,
    icon: 'check-decagram',
    label: 'Completed',
  },
  CANCELED: {
    color: '#fff',
    bgColor: systemColors.red,
    icon: 'close-circle-outline',
    label: 'Canceled',
  },
};

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  PENDING: { color: systemColors.orange, label: 'Pending' },
  PAID: { color: systemColors.green, label: 'Paid' },
  FAILED: { color: systemColors.red, label: 'Failed' },
  REFUNDED: { color: systemColors.purple, label: 'Refunded' },
};

function formatDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// FadeInView
// ---------------------------------------------------------------------------

function FadeInView({
  delay = 0,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
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
// Info Row
// ---------------------------------------------------------------------------

interface InfoRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}

function InfoRow({ icon, iconColor, label, value }: InfoRowProps) {
  return (
    <View style={infoStyles.row}>
      <View style={[infoStyles.iconCircle, { backgroundColor: iconColor + '14' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <View style={infoStyles.textCol}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
// Star Rating Display
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={18}
          color={star <= rating ? systemColors.yellow : systemColors.gray3}
        />
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

interface AppointmentDetailScreenProps {
  appointmentId: string;
}

export function AppointmentDetailScreen({
  appointmentId,
}: AppointmentDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [canceling, setCanceling] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await extractData<Appointment>(
        await api.get(`/appointments/${appointmentId}`)
      );
      setAppointment(data);

      // Try to fetch payment info
      try {
        const paymentData = await extractData<Payment>(
          await api.get(`/payments/appointment/${appointmentId}`)
        );
        setPayment(paymentData);
      } catch {
        setPayment(null);
      }
    } catch {
      setNotice('Could not load appointment details.');
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  }, [fetchDetail]);

  async function handleCancel() {
    setCanceling(true);
    try {
      const updated = await cancelAppointment(appointmentId);
      setAppointment(updated);
      setNotice('Appointment canceled successfully.');
    } catch {
      setNotice('Could not cancel appointment.');
    } finally {
      setCanceling(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator size="large" color={systemColors.blue} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={systemColors.gray3}
        />
        <Text style={styles.errorText}>Appointment not found</Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          buttonColor={systemColors.blue}
          textColor="#fff"
          style={{ marginTop: 16, borderRadius: 12 }}
        >
          Go back
        </Button>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.PENDING;
  const doctor = appointment.doctor;
  const timeSlot = appointment.timeSlot;
  const services = appointment.services ?? [];
  const review = appointment.review;
  const canCancel =
    appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
  const canReview =
    appointment.status === 'COMPLETED' && !review;

  return (
    <ScreenBackground>
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[systemColors.blue, '#0055CC']}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Appointment Details</Text>
            <View style={styles.backBtn} />
          </View>
        </LinearGradient>

        {/* Status Banner */}
        <FadeInView delay={0}>
          <View
            style={[styles.statusBanner, { backgroundColor: statusCfg.bgColor }]}
          >
            <MaterialCommunityIcons
              name={statusCfg.icon}
              size={20}
              color={statusCfg.color}
            />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </FadeInView>

        <View style={styles.cardList}>
          {/* Doctor Card */}
          {doctor && (
            <FadeInView delay={60}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/doctors/[id]',
                    params: { id: doctor.id },
                  })
                }
              >
                <GlassCard style={styles.card} glassStyle="regular">
                  <View style={styles.cardInner}>
                    <View style={styles.sectionHeader}>
                      <MaterialCommunityIcons
                        name="doctor"
                        size={18}
                        color={systemColors.blue}
                      />
                      <Text style={styles.sectionTitle}>Doctor</Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={systemColors.gray3}
                        style={{ marginLeft: 'auto' }}
                      />
                    </View>
                    <View style={styles.doctorRow}>
                      <View style={styles.avatarContainer}>
                        <Image
                          source={{
                            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=007AFF&color=fff&size=80`,
                          }}
                          style={styles.avatar}
                        />
                      </View>
                      <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName} numberOfLines={1}>
                          {doctor.name}
                        </Text>
                        <Text style={styles.specialtyText} numberOfLines={1}>
                          {doctor.specialty?.name ?? 'Specialist'}
                        </Text>
                        {doctor.clinic && (
                          <Text style={styles.clinicSmallText} numberOfLines={1}>
                            {doctor.clinic.name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </FadeInView>
          )}

          {/* Schedule Card */}
          <FadeInView delay={120}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={18}
                    color={systemColors.orange}
                  />
                  <Text style={styles.sectionTitle}>Schedule</Text>
                </View>
                <InfoRow
                  icon="calendar"
                  iconColor={systemColors.orange}
                  label="Date"
                  value={formatDate(timeSlot?.date)}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="clock-outline"
                  iconColor={systemColors.indigo}
                  label="Time"
                  value={
                    timeSlot
                      ? `${timeSlot.startTime} - ${timeSlot.endTime}`
                      : 'Not scheduled'
                  }
                />
                {doctor?.clinic && (
                  <>
                    <View style={styles.divider} />
                    <InfoRow
                      icon="map-marker"
                      iconColor={systemColors.red}
                      label="Location"
                      value={doctor.clinic.address}
                    />
                  </>
                )}
              </View>
            </GlassCard>
          </FadeInView>

          {/* Services Card */}
          {services.length > 0 && (
            <FadeInView delay={180}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                      name="medical-bag"
                      size={18}
                      color={systemColors.teal}
                    />
                    <Text style={styles.sectionTitle}>Services</Text>
                  </View>
                  {services.map((svc, idx) => (
                    <View key={svc.id}>
                      {idx > 0 && <View style={styles.divider} />}
                      <View style={styles.serviceRow}>
                        <Text style={styles.serviceName} numberOfLines={1}>
                          {svc.service?.name ?? 'Service'}
                        </Text>
                        <Text style={styles.servicePrice}>
                          {svc.price.toLocaleString()} VND
                        </Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <View style={styles.serviceRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>
                      {appointment.totalAmount.toLocaleString()} VND
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </FadeInView>
          )}

          {/* Total Amount (if no services) */}
          {services.length === 0 && appointment.totalAmount > 0 && (
            <FadeInView delay={180}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={18}
                      color={systemColors.green}
                    />
                    <Text style={styles.sectionTitle}>Amount</Text>
                  </View>
                  <View style={styles.serviceRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>
                      {appointment.totalAmount.toLocaleString()} VND
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </FadeInView>
          )}

          {/* Payment Status */}
          <FadeInView delay={240}>
            <GlassCard style={styles.card} glassStyle="regular">
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="credit-card-outline"
                    size={18}
                    color={systemColors.indigo}
                  />
                  <Text style={styles.sectionTitle}>Payment</Text>
                </View>
                {payment ? (
                  <View style={styles.paymentContent}>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Method</Text>
                      <Text style={styles.paymentValue}>
                        {payment.method}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentLabel}>Status</Text>
                      <View
                        style={[
                          styles.paymentBadge,
                          {
                            backgroundColor:
                              (PAYMENT_STATUS_CONFIG[payment.status]?.color ??
                                systemColors.gray) + '18',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBadgeText,
                            {
                              color:
                                PAYMENT_STATUS_CONFIG[payment.status]?.color ??
                                systemColors.gray,
                            },
                          ]}
                        >
                          {PAYMENT_STATUS_CONFIG[payment.status]?.label ??
                            payment.status}
                        </Text>
                      </View>
                    </View>
                    {payment.paidAt && (
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Paid on</Text>
                        <Text style={styles.paymentValue}>
                          {formatShortDate(payment.paidAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.paymentContent}>
                    <Text style={styles.noPaymentText}>
                      No payment recorded yet.
                    </Text>
                    {canCancel && (
                      <Button
                        mode="contained"
                        onPress={() =>
                          router.push({
                            pathname: '/payment',
                            params: { appointmentId: appointment.id },
                          })
                        }
                        buttonColor={systemColors.green}
                        textColor="#fff"
                        icon="credit-card"
                        style={styles.payNowBtn}
                      >
                        Pay now
                      </Button>
                    )}
                  </View>
                )}
              </View>
            </GlassCard>
          </FadeInView>

          {/* Notes */}
          {appointment.notes && (
            <FadeInView delay={300}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                      name="note-text-outline"
                      size={18}
                      color={systemColors.purple}
                    />
                    <Text style={styles.sectionTitle}>Patient Notes</Text>
                  </View>
                  <Text style={styles.notesText}>{appointment.notes}</Text>
                </View>
              </GlassCard>
            </FadeInView>
          )}

          {/* Diagnosis */}
          {appointment.diagnosis && (
            <FadeInView delay={360}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                      name="stethoscope"
                      size={18}
                      color={systemColors.green}
                    />
                    <Text style={styles.sectionTitle}>Diagnosis</Text>
                  </View>
                  <Text style={styles.notesText}>{appointment.diagnosis}</Text>
                </View>
              </GlassCard>
            </FadeInView>
          )}

          {/* Review (if exists) */}
          {review && (
            <FadeInView delay={420}>
              <GlassCard style={styles.card} glassStyle="regular">
                <View style={styles.cardInner}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons
                      name="star"
                      size={18}
                      color={systemColors.yellow}
                    />
                    <Text style={styles.sectionTitle}>Your Review</Text>
                  </View>
                  <StarRating rating={review.rating} />
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {formatShortDate(review.createdAt)}
                  </Text>
                </View>
              </GlassCard>
            </FadeInView>
          )}

          {/* Actions */}
          <FadeInView delay={480}>
            <View style={styles.actionsSection}>
              {canCancel && (
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  loading={canceling}
                  disabled={canceling}
                  textColor={systemColors.red}
                  icon="close-circle-outline"
                  style={styles.cancelBtn}
                  contentStyle={styles.actionBtnContent}
                >
                  Cancel Appointment
                </Button>
              )}

              {canReview && (
                <Button
                  mode="contained"
                  onPress={() =>
                    router.push({
                      pathname: '/review',
                      params: { appointmentId: appointment.id },
                    })
                  }
                  buttonColor={systemColors.yellow}
                  textColor="#000"
                  icon="star-outline"
                  style={styles.reviewBtn}
                  contentStyle={styles.actionBtnContent}
                >
                  Write a Review
                </Button>
              )}
            </View>
          </FadeInView>
        </View>
      </ScrollView>

      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice('')}
        duration={3000}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: systemColors.gray,
    marginTop: 12,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardList: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 12,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: systemColors.gray4,
  },
  // Doctor
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: systemColors.gray5,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  doctorInfo: {
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
    color: systemColors.blue,
    fontWeight: '500',
  },
  clinicSmallText: {
    fontSize: 13,
    color: systemColors.gray,
  },
  // Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  serviceName: {
    fontSize: 14,
    color: theme.colors.onSurface,
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: systemColors.green,
  },
  // Payment
  paymentContent: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    fontSize: 14,
    color: systemColors.gray,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noPaymentText: {
    fontSize: 14,
    color: systemColors.gray,
    fontStyle: 'italic',
  },
  payNowBtn: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  // Notes / Diagnosis
  notesText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  // Review
  reviewComment: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: 12,
    color: systemColors.gray,
  },
  // Actions
  actionsSection: {
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    borderColor: systemColors.red + '40',
    borderRadius: 14,
  },
  reviewBtn: {
    borderRadius: 14,
  },
  actionBtnContent: {
    paddingVertical: 4,
  },
});
