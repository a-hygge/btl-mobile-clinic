import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '../../store/auth.store';
import { useDoctors } from '../../hooks/use-doctors';
import { theme, systemColors } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';

const SPECIALTY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'Tim mach': 'heart-pulse',
  'Than kinh': 'brain',
  'Tieu hoa': 'stomach',
  'Da lieu': 'face-woman',
  'Nhi khoa': 'baby-face',
  'Mat': 'eye',
};

const SPECIALTY_COLORS: Record<string, string> = {
  'Tim mach': systemColors.red,
  'Than kinh': systemColors.purple,
  'Tieu hoa': systemColors.orange,
  'Da lieu': systemColors.pink,
  'Nhi khoa': systemColors.teal,
  'Mat': systemColors.indigo,
};

interface QuickAction {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Book Appointment',
    subtitle: 'Find a doctor',
    icon: 'calendar-plus',
    color: systemColors.green,
    bgColor: '#E8F9ED',
    route: '/booking',
  },
  {
    title: 'My Appointments',
    subtitle: 'Upcoming visits',
    icon: 'clipboard-list',
    color: systemColors.orange,
    bgColor: '#FFF3E0',
    route: '/appointments',
  },
  {
    title: 'AI Health Chat',
    subtitle: 'Ask anything',
    icon: 'robot',
    color: systemColors.indigo,
    bgColor: '#EDE7F6',
    route: '/chat',
  },
  {
    title: 'Health Tracking',
    subtitle: 'Your vitals',
    icon: 'heart-pulse',
    color: systemColors.red,
    bgColor: '#FFEBEE',
    route: '/health',
  },
];

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

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const { doctors, isLoading } = useDoctors(search);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Gradient header with greeting — no Lottie */}
      <LinearGradient
        colors={['#007AFF', '#0051D5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.greeting}>{greeting} 👋</Text>
        <Text style={styles.heroName}>{user?.name ?? 'User'}</Text>
        <Text style={styles.heroSub}>How are you feeling today?</Text>
      </LinearGradient>

      {/* Search bar — floating, white bg, prominent shadow */}
      <FadeInView delay={100}>
        <View style={styles.searchWrap}>
          <Searchbar
            placeholder="Search doctors or specialties..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={systemColors.gray}
          />
        </View>
      </FadeInView>

      {/* Quick actions 2x2 grid */}
      <FadeInView delay={200}>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.route}
              style={styles.quickCell}
              onPress={() => router.push(action.route as never)}
            >
              <GlassCard style={styles.quickCard}>
                <View style={[styles.quickIconCircle, { backgroundColor: action.bgColor }]}>
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={28}
                    color={action.color}
                  />
                </View>
                <Text style={styles.quickTitle} numberOfLines={1}>
                  {action.title}
                </Text>
                <Text style={styles.quickSubtitle} numberOfLines={1}>
                  {action.subtitle}
                </Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </FadeInView>

      {/* Top Doctors */}
      <FadeInView delay={300}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Doctors</Text>
            <Pressable onPress={() => router.push('/doctors' as never)}>
              <Text style={styles.seeAll}>See all ›</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <LottieView
                source={require('../../assets/animations/loading.json')}
                autoPlay
                loop
                style={{ width: 100, height: 100 }}
              />
            </View>
          ) : (
            doctors.map((doctor, index) => {
              const specialtyName = doctor.specialty?.name ?? '';
              const iconName = SPECIALTY_ICONS[specialtyName] ?? 'medical-bag';
              const iconColor = SPECIALTY_COLORS[specialtyName] ?? theme.colors.primary;
              const iconBg = `${iconColor}18`;

              return (
                <FadeInView key={doctor.id} delay={400 + index * 80}>
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
                        {/* Colored specialty circle */}
                        <View style={[styles.doctorAvatar, { backgroundColor: iconBg }]}>
                          <MaterialCommunityIcons
                            name={iconName}
                            size={24}
                            color={iconColor}
                          />
                        </View>

                        {/* Doctor info */}
                        <View style={styles.doctorInfo}>
                          <Text style={styles.doctorName} numberOfLines={1}>
                            {doctor.name}
                          </Text>
                          <Text style={styles.doctorMeta} numberOfLines={1}>
                            {specialtyName}
                            {doctor.clinic ? ` \u2022 ${doctor.clinic.name}` : ''}
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

                        {/* Fee + chevron */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 100,
  },

  /* -- Header -- */
  hero: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
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

  /* -- Search -- */
  searchWrap: {
    marginTop: -20,
    marginHorizontal: 16,
  },
  searchBar: {
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  searchInput: {
    fontSize: 15,
  },

  /* -- Quick actions 2x2 -- */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  quickCell: {
    width: '48%',
    flexGrow: 1,
  },
  quickCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    minHeight: 80,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  quickSubtitle: {
    fontSize: 12,
    color: systemColors.gray,
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
