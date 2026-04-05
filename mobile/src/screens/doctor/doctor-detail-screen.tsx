import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useDoctorDetail } from '../../hooks/use-doctor-detail';
import { theme } from '../../constants/theme';

interface DoctorDetailScreenProps {
  doctorId: string;
}

export function DoctorDetailScreen({ doctorId }: DoctorDetailScreenProps) {
  const { doctor, isLoading } = useDoctorDetail(doctorId);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Button icon="arrow-left" mode="text" onPress={() => router.back()}>
          Back
        </Button>
      </View>

      {doctor ? (
        <>
          <View style={styles.hero}>
            <Text variant="headlineSmall" style={styles.title}>
              {doctor.name}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {doctor.specialty.name}
              {doctor.clinic ? ` • ${doctor.clinic.name}` : ''}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {doctor.experienceYears} years experience • {doctor.consultationFee.toLocaleString()} VND
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">About</Text>
              <Text variant="bodyMedium">{doctor.bio || 'Profile is being updated.'}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                Rating: {(doctor.averageRating ?? 0).toFixed(1)} ({doctor.totalReviews ?? 0} reviews)
              </Text>
            </Card.Content>
          </Card>

          {doctor.doctorServices && doctor.doctorServices.length > 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium">Services</Text>
                {doctor.doctorServices.map((service) => (
                  <View key={service.id} style={styles.serviceRow}>
                    <Text variant="bodyMedium">{service.name}</Text>
                    <Text variant="bodyMedium">{service.price.toLocaleString()} VND</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          ) : null}

          <Button mode="contained" onPress={() => router.push('/booking')}>
            Book this specialty
          </Button>
        </>
      ) : (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="bodyMedium">
              {isLoading ? 'Loading doctor details...' : 'Doctor details are unavailable.'}
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    gap: 6,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.primary,
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
    gap: 12,
  },
  meta: {
    color: theme.colors.onSurfaceVariant,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
