import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useDoctors } from '../../hooks/use-doctors';
import { theme, systemColors } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { FadeInView, ScreenContainer, SectionTitle } from '../../components/shared';
import { api, extractData, extractPaginatedData } from '../../services/api';
import type { Appointment, Specialty } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPECIALTY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'Tim mach': 'heart-pulse',
  'Than kinh': 'brain',
  'Tieu hoa': 'stomach',
  'Da lieu': 'face-woman',
  'Nhi khoa': 'baby-face',
  'Mat': 'eye',
  'Tai Mui Hong': 'ear-hearing',
  'Co Xuong Khop': 'bone',
  'Rang Ham Mat': 'tooth',
  'Phu san': 'human-pregnant',
};

const SPECIALTY_COLORS: Record<string, string> = {
  'Tim mach': systemColors.red,
  'Than kinh': systemColors.purple,
  'Tieu hoa': systemColors.orange,
  'Da lieu': systemColors.pink,
  'Nhi khoa': systemColors.teal,
  'Mat': systemColors.indigo,
  'Tai Mui Hong': systemColors.green,
  'Co Xuong Khop': systemColors.yellow,
  'Rang Ham Mat': systemColors.blue,
  'Phu san': '#E91E63',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getCountdownLabel(dateStr: string, startTime: string): string {
  const now = new Date();
  // Build target date from slot date + startTime (HH:mm)
  const target = new Date(dateStr);
  if (startTime) {
    const [hh, mm] = startTime.split(':');
    target.setHours(Number(hh), Number(mm), 0, 0);
  }

  const diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) return 'Now';

  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0 && diffHours < 1) return `In ${diffMin} min`;
  if (diffDays === 0) return `Today ${startTime}`;
  if (diffDays === 1) return `Tomorrow ${startTime}`;
  return `In ${diffDays} days`;
}

function formatTime(t?: string): string {
  if (!t) return '';
  return t.slice(0, 5); // HH:mm
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { doctors, isLoading: doctorsLoading } = useDoctors('');

  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async () => {
    try {
      const [
        confirmedRes,
        pendingRes,
        specialtiesRes,
        completedRes,
        notifsRes,
      ] = await Promise.allSettled([
        api.get('/appointments/me', {
          params: { status: 'CONFIRMED', limit: 1, sort: 'date', order: 'asc' },
        }),
        api.get('/appointments/me', {
          params: { status: 'PENDING', limit: 1, sort: 'date', order: 'asc' },
        }),
        api.get('/specialties'),
        api.get('/appointments/me', {
          params: { status: 'COMPLETED', limit: 1 },
        }),
        api.get('/notifications/me', {
          params: { limit: 1, isRead: false },
        }),
      ]);

      // Upcoming appointment: prefer CONFIRMED, fall back to PENDING
      let upcoming: Appointment | null = null;
      if (confirmedRes.status === 'fulfilled') {
        const { data } = extractPaginatedData<Appointment[]>(confirmedRes.value);
        if (data.length > 0) upcoming = data[0];
      }
      if (!upcoming && pendingRes.status === 'fulfilled') {
        const { data } = extractPaginatedData<Appointment[]>(pendingRes.value);
        if (data.length > 0) upcoming = data[0];
      }
      setUpcomingAppointment(upcoming);

      // Specialties
      if (specialtiesRes.status === 'fulfilled') {
        const specData = extractData<Specialty[]>(specialtiesRes.value);
        setSpecialties(specData);
      }

      // Upcoming count (confirmed count from meta)
      let uCount = 0;
      if (confirmedRes.status === 'fulfilled') {
        uCount += confirmedRes.value.data.meta?.total ?? 0;
      }
      if (pendingRes.status === 'fulfilled') {
        uCount += pendingRes.value.data.meta?.total ?? 0;
      }
      setUpcomingCount(uCount);

      // Completed count
      if (completedRes.status === 'fulfilled') {
        setCompletedCount(completedRes.value.data.meta?.total ?? 0);
      }

      // Unread notifications
      if (notifsRes.status === 'fulfilled') {
        setUnreadNotifs(notifsRes.value.data.meta?.total ?? 0);
      }
    } catch {
      // Silently handle — partial data is fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, [fetchHomeData]);

  const greeting = getGreeting();
  const topDoctors = doctors.slice(0, 5);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderHeroAppointment = () => {
    if (loading) {
      return (
        <GlassCard style={styles.appointmentCard}>
          <View style={styles.appointmentLoading}>
            <LottieView
              source={require('../../assets/animations/loading.json')}
              autoPlay
              loop
              style={{ width: 60, height: 60 }}
            />
          </View>
        </GlassCard>
      );
    }

    if (!upcomingAppointment) {
      return (
        <Pressable onPress={() => router.push('/booking' as never)}>
          <GlassCard style={styles.appointmentCard}>
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconCircle}>
                <MaterialCommunityIcons
                  name="calendar-plus"
                  size={28}
                  color="#fff"
                />
              </View>
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>Book your first appointment</Text>
                <Text style={styles.ctaSubtitle}>
                  Find a doctor and schedule a visit
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={systemColors.gray3}
              />
            </View>
          </GlassCard>
        </Pressable>
      );
    }

    const appt = upcomingAppointment;
    const doctorName = appt.doctor?.name ?? 'Doctor';
    const specialtyName = appt.doctor?.specialty?.name ?? '';
    const slotDate = appt.timeSlot?.date ?? appt.createdAt;
    const slotStart = formatTime(appt.timeSlot?.startTime);
    const slotEnd = formatTime(appt.timeSlot?.endTime);
    const countdown = getCountdownLabel(slotDate, slotStart);
    const iconColor = SPECIALTY_COLORS[specialtyName] ?? systemColors.blue;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/appointments/[id]',
            params: { id: appt.id },
          } as never)
        }
      >
        <GlassCard style={styles.appointmentCard}>
          <View style={styles.appointmentHeader}>
            <Text style={styles.appointmentLabel}>Next Appointment</Text>
            <View style={[styles.countdownBadge, { backgroundColor: `${iconColor}18` }]}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={iconColor} />
              <Text style={[styles.countdownText, { color: iconColor }]}>
                {countdown}
              </Text>
            </View>
          </View>

          <View style={styles.appointmentBody}>
            <View style={[styles.doctorAvatarSmall, { backgroundColor: `${iconColor}18` }]}>
              <MaterialCommunityIcons
                name={SPECIALTY_ICONS[specialtyName] ?? 'medical-bag'}
                size={24}
                color={iconColor}
              />
            </View>
            <View style={styles.appointmentInfo}>
              <Text style={styles.appointmentDoctor} numberOfLines={1}>
                {doctorName}
              </Text>
              <Text style={styles.appointmentSpecialty} numberOfLines={1}>
                {specialtyName}
              </Text>
              <View style={styles.appointmentTimeRow}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={13}
                  color={systemColors.gray}
                />
                <Text style={styles.appointmentTimeText}>
                  {formatDate(slotDate)}
                  {slotStart ? `  ${slotStart}` : ''}
                  {slotEnd ? ` - ${slotEnd}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  const renderSpecialtyItem = ({ item }: { item: Specialty }) => {
    const iconName = SPECIALTY_ICONS[item.name] ?? 'medical-bag';
    const color = SPECIALTY_COLORS[item.name] ?? systemColors.blue;

    return (
      <Pressable
        style={styles.specialtyItem}
        onPress={() =>
          router.push({
            pathname: '/booking',
            params: { specialtyId: item.id },
          } as never)
        }
      >
        <View style={[styles.specialtyIconCircle, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={iconName} size={26} color={color} />
        </View>
        <Text style={styles.specialtyName} numberOfLines={2}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <FadeInView delay={0}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroName}>{user?.name ?? 'User'}</Text>
          <Text style={styles.heroSub}>How are you feeling today?</Text>
        </FadeInView>
      </LinearGradient>

      {/* Hero: Next Appointment Card */}
      <FadeInView delay={100}>
        <View style={styles.heroCardWrap}>
          {renderHeroAppointment()}
        </View>
      </FadeInView>

      {/* Specialties Horizontal Scroll */}
      {specialties.length > 0 && (
        <FadeInView delay={200}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Specialties</Text>
          </View>
          <FlatList
            horizontal
            data={specialties}
            keyExtractor={(item) => item.id}
            renderItem={renderSpecialtyItem}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specialtiesList}
          />
        </FadeInView>
      )}

      {/* Quick Stats Row */}
      <FadeInView delay={300}>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#007AFF18' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={systemColors.blue} />
            </View>
            <Text style={styles.statValue}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#34C75918' }]}>
              <MaterialCommunityIcons name="check-circle" size={20} color={systemColors.green} />
            </View>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FF950018' }]}>
              <MaterialCommunityIcons name="bell-badge" size={20} color={systemColors.orange} />
            </View>
            <Text style={styles.statValue}>{unreadNotifs}</Text>
            <Text style={styles.statLabel}>Notifications</Text>
          </GlassCard>
        </View>
      </FadeInView>

      {/* Find a doctor CTA */}
      <FadeInView delay={350}>
        <View style={styles.findDoctorWrap}>
          <Pressable onPress={() => router.push('/doctor-search' as never)}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.findDoctorCard}
            >
              <View style={styles.findDoctorIcon}>
                <MaterialCommunityIcons
                  name="doctor"
                  size={24}
                  color="#fff"
                />
              </View>
              <View style={styles.findDoctorText}>
                <Text style={styles.findDoctorTitle}>Find a doctor</Text>
                <Text style={styles.findDoctorSubtitle}>
                  Search by name, specialty, or rating
                </Text>
              </View>
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          </Pressable>
        </View>
      </FadeInView>

      {/* Top Doctors */}
      <FadeInView delay={400}>
        <View style={{ marginTop: 24 }}>
          <SectionTitle
            title="Top Doctors"
            action={{ label: 'See all', onPress: () => router.push('/doctor-search' as never) }}
          />
        </View>
        <View style={styles.section}>
          {doctorsLoading ? (
            <View style={styles.loadingWrap}>
              <LottieView
                source={require('../../assets/animations/loading.json')}
                autoPlay
                loop
                style={{ width: 100, height: 100 }}
              />
            </View>
          ) : (
            topDoctors.map((doctor, index) => {
              const specialtyName = doctor.specialty?.name ?? '';
              const iconName = SPECIALTY_ICONS[specialtyName] ?? 'medical-bag';
              const iconColor = SPECIALTY_COLORS[specialtyName] ?? theme.colors.primary;
              const iconBg = `${iconColor}18`;

              return (
                <FadeInView key={doctor.id} delay={500 + index * 80}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/doctors/[id]',
                        params: { id: doctor.id },
                      })
                    }
                  >
                    <GlassCard style={styles.doctorCard}>
                      <View style={styles.doctorRow}>
                        <View style={[styles.doctorAvatar, { backgroundColor: iconBg }]}>
                          <MaterialCommunityIcons
                            name={iconName}
                            size={24}
                            color={iconColor}
                          />
                        </View>

                        <View style={styles.doctorInfo}>
                          <Text style={styles.doctorName} numberOfLines={1}>
                            {doctor.name}
                          </Text>
                          <Text style={styles.doctorMeta} numberOfLines={1}>
                            {specialtyName}
                          </Text>
                          <View style={styles.doctorStats}>
                            <MaterialCommunityIcons
                              name="star"
                              size={13}
                              color={systemColors.orange}
                            />
                            <Text style={styles.ratingText}>
                              {(doctor.averageRating ?? 0).toFixed(1)}
                            </Text>
                            <View style={styles.statDot} />
                            <Text style={styles.expText}>
                              {doctor.experienceYears}y exp
                            </Text>
                          </View>
                        </View>

                        <View style={styles.doctorRight}>
                          <Text style={styles.feeText}>
                            {doctor.consultationFee.toLocaleString()}d
                          </Text>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={20}
                            color={systemColors.gray3}
                          />
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                </FadeInView>
              );
            })
          )}
        </View>
      </FadeInView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },

  /* -- Header -- */
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

  /* -- Hero Appointment Card -- */
  heroCardWrap: {
    marginTop: -20,
    marginHorizontal: 16,
  },
  appointmentCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  appointmentLoading: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: systemColors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatarSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentInfo: {
    flex: 1,
    gap: 2,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  appointmentSpecialty: {
    fontSize: 14,
    color: systemColors.gray,
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  appointmentTimeText: {
    fontSize: 13,
    color: systemColors.gray,
  },

  /* -- CTA (no appointment) -- */
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: systemColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: systemColors.gray,
  },

  /* -- Specialties -- */
  specialtiesList: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 4,
  },
  specialtyItem: {
    alignItems: 'center',
    width: 72,
  },
  specialtyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specialtyName: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
    lineHeight: 15,
  },

  /* -- Quick Stats -- */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
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
    fontSize: 12,
    color: systemColors.gray,
  },

  /* -- Find a doctor CTA -- */
  findDoctorWrap: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  findDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  findDoctorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findDoctorText: {
    flex: 1,
  },
  findDoctorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  findDoctorSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  /* -- Sections -- */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  /* -- Doctor cards -- */
  doctorCard: {
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  doctorMeta: {
    fontSize: 13,
    color: systemColors.gray,
  },
  doctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: systemColors.orange,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: systemColors.gray3,
  },
  expText: {
    fontSize: 12,
    color: systemColors.gray,
  },
  doctorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  feeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
