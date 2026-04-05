import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '../../store/auth.store';
import { useDoctors } from '../../hooks/use-doctors';
import { theme } from '../../constants/theme';
import { GlassCard } from '../../components/ui/GlassCard';

const SPECIALTY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'Tim mach': 'heart-pulse',
  'Than kinh': 'brain',
  'Tieu hoa': 'stomach',
  'Da lieu': 'face-woman',
  'Nhi khoa': 'baby-face',
  'Mat': 'eye',
};

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
      {/* Hero gradient header */}
      <LinearGradient
        colors={['#2196F3', '#1565C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroText}>
            <Text variant="bodyLarge" style={styles.greeting}>
              {greeting} 👋
            </Text>
            <Text variant="headlineMedium" style={styles.heroName}>
              {user?.name ?? 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.heroSub}>
              How are you feeling today?
            </Text>
          </View>
          <LottieView
            source={require('../../assets/animations/health-pulse.json')}
            autoPlay
            loop
            style={styles.heroLottie}
          />
        </View>
      </LinearGradient>

      {/* Search bar - floating over gradient */}
      <FadeInView delay={100}>
        <View style={styles.searchWrap}>
          <Searchbar
            placeholder="Search doctors or specialties..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            elevation={2}
          />
        </View>
      </FadeInView>

      {/* Quick actions */}
      <FadeInView delay={200}>
        <View style={styles.quickActions}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/booking')}>
            <GlassCard style={styles.actionGlass} tintColor="#4CAF50" interactive>
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="calendar-plus" size={28} color="#fff" />
                <Text variant="labelLarge" style={styles.actionLabel}>
                  Book Now
                </Text>
              </LinearGradient>
            </GlassCard>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push('/appointments')}>
            <GlassCard style={styles.actionGlass} tintColor="#FF9800" interactive>
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="clipboard-list" size={28} color="#fff" />
                <Text variant="labelLarge" style={styles.actionLabel}>
                  My Visits
                </Text>
              </LinearGradient>
            </GlassCard>
          </Pressable>

          <Pressable style={styles.actionCard} onPress={() => router.push('/profile')}>
            <GlassCard style={styles.actionGlass} tintColor="#9C27B0" interactive>
              <LinearGradient
                colors={['#9C27B0', '#7B1FA2']}
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="account-heart" size={28} color="#fff" />
                <Text variant="labelLarge" style={styles.actionLabel}>
                  Health
                </Text>
              </LinearGradient>
            </GlassCard>
          </Pressable>
        </View>
      </FadeInView>

      {/* Top Doctors */}
      <FadeInView delay={300}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Top Doctors
            </Text>
            <Text variant="bodySmall" style={styles.seeAll}>
              {doctors.length} available
            </Text>
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
              const iconName = doctor.specialty?.name
                ? SPECIALTY_ICONS[doctor.specialty.name] ?? 'medical-bag'
                : 'medical-bag';

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
                    <GlassCard style={styles.doctorCard} tintColor={theme.colors.primary} interactive>
                      <View style={styles.doctorContent}>
                        <View style={styles.doctorIcon}>
                          <MaterialCommunityIcons
                            name={iconName}
                            size={28}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={styles.doctorInfo}>
                          <Text variant="titleMedium" style={styles.doctorName}>
                            {doctor.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.doctorMeta}>
                            {doctor.specialty?.name}
                            {doctor.clinic ? ` • ${doctor.clinic.name}` : ''}
                          </Text>
                          <View style={styles.doctorStats}>
                            <MaterialCommunityIcons name="star" size={14} color="#FF9800" />
                            <Text variant="bodySmall" style={styles.rating}>
                              {(doctor.averageRating ?? 0).toFixed(1)}
                            </Text>
                            <Text variant="bodySmall" style={styles.doctorMeta}>
                              • {doctor.experienceYears}y exp
                            </Text>
                            <Text variant="bodySmall" style={styles.fee}>
                              {doctor.consultationFee.toLocaleString()}đ
                            </Text>
                          </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
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
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: 'rgba(255,255,255,0.85)',
  },
  heroName: {
    color: '#fff',
    fontWeight: '700',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroLottie: {
    width: 100,
    height: 100,
  },
  searchWrap: {
    marginTop: -22,
    marginHorizontal: 16,
  },
  searchBar: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGlass: {
    padding: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  seeAll: {
    color: theme.colors.primary,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  doctorCard: {
    marginBottom: 10,
    borderRadius: 16,
  },
  doctorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontWeight: '600',
  },
  doctorMeta: {
    color: '#757575',
  },
  doctorStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontWeight: '600',
    color: '#FF9800',
  },
  fee: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 'auto',
  },
});
