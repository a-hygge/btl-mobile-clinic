import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { theme, systemColors } from '../../constants/theme';
import { api, extractData } from '../../services/api';
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
// StarRating
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (value: number) => void;
}) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRate(star)} hitSlop={8}>
          <MaterialCommunityIcons
            name={star <= rating ? 'star' : 'star-outline'}
            size={32}
            color={star <= rating ? systemColors.yellow : systemColors.gray3}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReviewScreen
// ---------------------------------------------------------------------------

interface ReviewScreenProps {
  appointmentId: string;
}

export function ReviewScreen({ appointmentId }: ReviewScreenProps) {
  const insets = useSafeAreaInsets();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    fetchAppointment();
  }, [appointmentId]);

  async function fetchAppointment() {
    try {
      setLoading(true);
      const data = extractData<Appointment>(
        await api.get(`/appointments/${appointmentId}`)
      );
      setAppointment(data);
    } catch {
      setSnackbar({ visible: true, message: 'Failed to load appointment.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (rating === 0) {
      setSnackbar({ visible: true, message: 'Please select a rating.' });
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/reviews', {
        appointmentId,
        rating,
        comment: comment.trim() || undefined,
      });
      setSnackbar({ visible: true, message: 'Review submitted!' });
      setTimeout(() => router.back(), 800);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message ?? 'Failed to submit review.')
          : 'Failed to submit review.';
      setSnackbar({ visible: true, message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenBackground>
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[systemColors.orange, systemColors.pink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Write a Review
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Share your experience with the doctor
          </Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" />
        ) : (
          <>
            {/* Doctor Info Card */}
            <FadeInView delay={100}>
              <GlassCard style={styles.card}>
                <View style={styles.doctorRow}>
                  <View style={styles.doctorAvatar}>
                    <MaterialCommunityIcons
                      name="doctor"
                      size={28}
                      color={systemColors.blue}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.doctorName}>
                      {appointment?.doctor?.name ?? 'Doctor'}
                    </Text>
                    <Text variant="bodySmall" style={styles.doctorSpecialty}>
                      {appointment?.doctor?.specialty?.name ?? 'Specialist'}
                    </Text>
                    {appointment?.doctor?.clinic?.name && (
                      <Text variant="bodySmall" style={styles.clinicName}>
                        {appointment.doctor.clinic.name}
                      </Text>
                    )}
                  </View>
                </View>
              </GlassCard>
            </FadeInView>

            {/* Star Rating */}
            <FadeInView delay={200}>
              <GlassCard style={styles.card}>
                <View style={styles.ratingSection}>
                  <Text variant="titleSmall" style={styles.sectionLabel}>
                    How was your experience?
                  </Text>
                  <StarRating rating={rating} onRate={setRating} />
                  <Text variant="bodySmall" style={styles.ratingHint}>
                    {rating === 0
                      ? 'Tap a star to rate'
                      : rating <= 2
                        ? 'We\'re sorry to hear that'
                        : rating <= 3
                          ? 'Thank you for your feedback'
                          : 'Glad you had a great experience!'}
                  </Text>
                </View>
              </GlassCard>
            </FadeInView>

            {/* Comment Input */}
            <FadeInView delay={300}>
              <GlassCard style={styles.card}>
                <Text variant="titleSmall" style={styles.sectionLabel}>
                  Your comments
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="Share your experience..."
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={4}
                  style={styles.textInput}
                  outlineStyle={{ borderRadius: 12 }}
                />
              </GlassCard>
            </FadeInView>

            {/* Submit Button */}
            <FadeInView delay={400}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || rating === 0}
                icon="send"
                style={styles.submitBtn}
                contentStyle={styles.submitBtnContent}
                labelStyle={styles.submitBtnLabel}
              >
                Submit Review
              </Button>
            </FadeInView>
          </>
        )}
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
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
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 4,
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: systemColors.gray6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  doctorSpecialty: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  clinicName: {
    color: systemColors.gray,
    marginTop: 2,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingHint: {
    color: theme.colors.onSurfaceVariant,
  },
  sectionLabel: {
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
  },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: systemColors.orange,
  },
  submitBtnContent: {
    paddingVertical: 6,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
