import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Searchbar, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { useDoctors } from '../../hooks/use-doctors';
import { theme } from '../../constants/theme';
import { HealthPulse } from '../../components/health-pulse';

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [search, setSearch] = useState('');
  const { doctors, isLoading, error, reload } = useDoctors(search);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroCard}>
          <View style={styles.heroText}>
            <Text variant="headlineMedium" style={styles.title}>
              Welcome back
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {user?.name ?? 'BTL Healthcare user'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Browse doctors, pick a slot, and book care in a few taps.
            </Text>
          </View>
          <HealthPulse size={112} />
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Quick actions
          </Text>
          <Button mode="contained" onPress={() => router.push('/appointments')}>
            View my appointments
          </Button>
          <Button mode="outlined" onPress={() => void reload()}>
            Refresh doctors
          </Button>
        </Card.Content>
      </Card>

      <Searchbar
        placeholder="Search doctors or specialties"
        value={search}
        onChangeText={setSearch}
      />

      {doctors.length > 0 ? (
        doctors.map((doctor) => (
          <Card key={doctor.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {doctor.name}
              </Text>
              <Text variant="bodyMedium" style={styles.cardBody}>
                {doctor.specialty.name}
                {doctor.clinic ? ` • ${doctor.clinic.name}` : ''}
              </Text>
              <Text variant="bodyMedium" style={styles.cardBody}>
                {doctor.experienceYears} years • {doctor.consultationFee.toLocaleString()} VND
              </Text>
              <Text variant="bodySmall" style={styles.cardBody}>
                Rating {(doctor.averageRating ?? 0).toFixed(1)} ({doctor.totalReviews ?? 0} reviews)
              </Text>
              <Button
                mode="contained-tonal"
                onPress={() =>
                  router.push({
                    pathname: '/doctors/[id]',
                    params: { id: doctor.id },
                  })
                }
              >
                View details
              </Button>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="bodyMedium">
              {isLoading ? 'Loading doctors...' : error || 'No doctors found.'}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Button mode="contained" onPress={handleLogout}>
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 20,
    paddingBottom: 40,
  },
  hero: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroText: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  cardContent: {
    gap: 10,
  },
  cardTitle: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  cardBody: {
    color: theme.colors.onSurfaceVariant,
  },
});
