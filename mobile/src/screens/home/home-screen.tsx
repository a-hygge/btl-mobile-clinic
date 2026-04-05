import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { theme } from '../../constants/theme';

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {user?.name ?? 'BTL Healthcare user'}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            App shell is ready
          </Text>
          <Text variant="bodyMedium" style={styles.cardBody}>
            Next slices can plug in doctors, clinics, appointments, and booking flows here.
          </Text>
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleLogout}>
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 20,
    justifyContent: 'center',
  },
  hero: {
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
