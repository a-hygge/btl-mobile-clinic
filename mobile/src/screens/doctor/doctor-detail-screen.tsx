import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { FadeInView, ScreenContainer } from '../../components/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoctorDetail } from '../../hooks/use-doctor-detail';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STAGGER_DELAY = 120;

interface DoctorDetailScreenProps {
  doctorId: string;
}

/* ------------------------------------------------------------------ */
/*  Skeleton placeholder                                              */
/* ------------------------------------------------------------------ */

function SkeletonBlock({ width, height, style }: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.5],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: 8,
          backgroundColor: theme.colors.outline,
          opacity,
        },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <SkeletonBlock width={SCREEN_WIDTH * 0.5} height={28} />
        <SkeletonBlock width={SCREEN_WIDTH * 0.35} height={16} style={{ marginTop: 10 }} />
        <SkeletonBlock width={SCREEN_WIDTH * 0.6} height={16} style={{ marginTop: 8 }} />
      </View>

      {/* About card skeleton */}
      <View style={styles.skeletonCard}>
        <SkeletonBlock width={80} height={18} />
        <SkeletonBlock width={'100%' as unknown as number} height={14} style={{ marginTop: 12 }} />
        <SkeletonBlock width={'90%' as unknown as number} height={14} style={{ marginTop: 8 }} />
        <SkeletonBlock width={'70%' as unknown as number} height={14} style={{ marginTop: 8 }} />
      </View>

      {/* Services card skeleton */}
      <View style={styles.skeletonCard}>
        <SkeletonBlock width={90} height={18} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.serviceRow, { marginTop: 12 }]}>
            <SkeletonBlock width={SCREEN_WIDTH * 0.4} height={14} />
            <SkeletonBlock width={80} height={14} />
          </View>
        ))}
      </View>

      {/* Button skeleton */}
      <SkeletonBlock width={'100%' as unknown as number} height={48} style={{ borderRadius: 24 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Star rating                                                       */
/* ------------------------------------------------------------------ */

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <MaterialCommunityIcons key={`full-${i}`} name="star" size={18} color="#FF9500" />
      ))}
      {halfStar && <MaterialCommunityIcons name="star-half-full" size={18} color="#FF9500" />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={18} color="#FF9500" />
      ))}
      <Text variant="bodySmall" style={styles.reviewText}>
        {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main screen                                                       */
/* ------------------------------------------------------------------ */

export function DoctorDetailScreen({ doctorId }: DoctorDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { doctor, isLoading } = useDoctorDetail(doctorId);

  if (isLoading) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.backRow}>
          <Button
            icon="arrow-left"
            mode="text"
            textColor="#fff"
            onPress={() => router.back()}
          >
            Back
          </Button>
        </View>
        <LoadingSkeleton />
      </ScrollView>
    );
  }

  if (!doctor) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.backRow}>
          <Button icon="arrow-left" mode="text" onPress={() => router.back()}>
            Back
          </Button>
        </View>
        <GlassCard style={styles.card}>
          <View style={styles.cardContent}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={40}
              color={theme.colors.error}
              style={{ alignSelf: 'center' }}
            />
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              Doctor details are unavailable.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    );
  }

  const rating = doctor.averageRating ?? 0;
  const reviews = doctor.totalReviews ?? 0;

  return (
    <ScreenContainer contentStyle={styles.content}>
      {/* ---- Gradient header ---- */}
      <FadeInView delay={0 * STAGGER_DELAY} duration={450} distance={24}>
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.backRow}>
            <Button
              icon="arrow-left"
              mode="text"
              textColor="#fff"
              onPress={() => router.back()}
            >
              Back
            </Button>
          </View>

          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="doctor" size={48} color={theme.colors.primary} />
          </View>

          <Text variant="headlineSmall" style={styles.heroName}>
            {doctor.name}
          </Text>
          <Text variant="bodyMedium" style={styles.heroSpecialty}>
            {doctor.specialty.name}
            {doctor.clinic ? ` \u2022 ${doctor.clinic.name}` : ''}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="briefcase-outline" size={16} color="#fff" />
              <Text style={styles.badgeText}>{doctor.experienceYears} yrs</Text>
            </View>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="cash" size={16} color="#fff" />
              <Text style={styles.badgeText}>
                {doctor.consultationFee.toLocaleString()} VND
              </Text>
            </View>
          </View>
        </LinearGradient>
      </FadeInView>

      {/* ---- Rating ---- */}
      <FadeInView delay={1 * STAGGER_DELAY} duration={450} distance={24}>
        <GlassCard style={styles.card}>
          <View style={styles.cardContent}>
            <StarRating rating={rating} reviewCount={reviews} />
          </View>
        </GlassCard>
      </FadeInView>

      {/* ---- About ---- */}
      <FadeInView delay={2 * STAGGER_DELAY} duration={450} distance={24}>
        <GlassCard style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>About</Text>
            </View>
            <Text variant="bodyMedium" style={styles.bodyText}>
              {doctor.bio || 'Profile is being updated.'}
            </Text>
          </View>
        </GlassCard>
      </FadeInView>

      {/* ---- Services ---- */}
      {doctor.doctorServices && doctor.doctorServices.length > 0 && (
        <FadeInView delay={3 * STAGGER_DELAY} duration={450} distance={24}>
          <GlassCard style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>Services</Text>
              </View>
              {doctor.doctorServices.map((service) => (
                <View key={service.id} style={styles.serviceRow}>
                  <Text variant="bodyMedium" style={styles.serviceName}>
                    {service.name}
                  </Text>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>
                      {service.price.toLocaleString()} VND
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>
        </FadeInView>
      )}

      {/* ---- Book button ---- */}
      <FadeInView delay={4 * STAGGER_DELAY} duration={450} distance={24}>
        <LinearGradient
          colors={['#007AFF', '#0051D5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bookGradient}
        >
          <Button
            mode="text"
            textColor="#fff"
            icon="calendar-check"
            contentStyle={styles.bookButtonContent}
            labelStyle={styles.bookButtonLabel}
            onPress={() => router.push('/booking')}
          >
            Book this specialty
          </Button>
        </LinearGradient>
      </FadeInView>
    </ScreenContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
    gap: 16,
  },

  /* Gradient header */
  gradientHeader: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    gap: 8,
  },
  backRow: {
    alignSelf: 'flex-start',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroName: {
    fontWeight: '700',
    color: '#fff',
  },
  heroSpecialty: {
    color: 'rgba(255,255,255,0.85)',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Stars */
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewText: {
    marginLeft: 6,
    color: theme.colors.onSurfaceVariant,
  },

  /* Cards */
  card: {
    marginHorizontal: 16,
  },
  cardContent: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  bodyText: {
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
  },

  /* Services */
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  serviceName: {
    flex: 1,
  },
  priceTag: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },

  /* Book button */
  bookGradient: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  bookButtonContent: {
    height: 50,
  },
  bookButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Skeleton */
  skeletonContainer: {
    padding: 20,
    gap: 20,
  },
  skeletonHeader: {
    gap: 4,
    alignItems: 'center',
    paddingVertical: 16,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 16,
  },
});
