import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Snackbar, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { createAppointment } from '../../services/appointments.service';
import { useDoctorDetail } from '../../hooks/use-doctor-detail';
import { theme } from '../../constants/theme';

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message ?? 'Could not complete booking.';
  }

  return 'Could not complete booking.';
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

interface DoctorDetailScreenProps {
  doctorId: string;
}

export function DoctorDetailScreen({ doctorId }: DoctorDetailScreenProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const { doctor, slots, isLoading, error, reload } = useDoctorDetail(doctorId, selectedDate);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const availableSlots = useMemo(
    () => slots.filter((slot) => !slot.isBooked),
    [slots]
  );

  async function handleBook() {
    if (!doctor || !selectedSlotId) {
      setNotice('Please choose an available slot first.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        doctorId: doctor.id,
        timeSlotId: selectedSlotId,
        notes: notes.trim() || undefined,
      });
      router.replace('/appointments');
    } catch (bookingError) {
      setNotice(getErrorMessage(bookingError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Button mode="text" onPress={() => router.back()}>
          Back
        </Button>
        <Button mode="text" onPress={() => void reload()}>
          Refresh
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
              <Text variant="titleMedium">Doctor profile</Text>
              <Text variant="bodyMedium">{doctor.bio || 'Profile is being updated.'}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                Rating: {(doctor.averageRating ?? 0).toFixed(1)} ({doctor.totalReviews ?? 0} reviews)
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">Booking date</Text>
              <TextInput
                mode="outlined"
                label="Date (YYYY-MM-DD)"
                value={selectedDate}
                onChangeText={setSelectedDate}
              />
              <Text variant="bodySmall" style={styles.meta}>
                Use any seeded date within the next 7 days.
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">Available slots</Text>
              <View style={styles.slotList}>
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <Chip
                      key={slot.id}
                      selected={selectedSlotId === slot.id}
                      onPress={() => setSelectedSlotId(slot.id)}
                      style={styles.slotChip}
                    >
                      {slot.startTime} - {slot.endTime}
                    </Chip>
                  ))
                ) : (
                  <Text variant="bodyMedium">No open slots for this date.</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">Notes</Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                label="Symptoms or notes"
                value={notes}
                onChangeText={setNotes}
              />
              <Button
                mode="contained"
                onPress={handleBook}
                loading={submitting}
                disabled={submitting || isLoading}
              >
                Confirm booking
              </Button>
            </Card.Content>
          </Card>

          {doctor.doctorServices.length > 0 ? (
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

      <Snackbar visible={Boolean(error || notice)} onDismiss={() => setNotice('')}>
        {notice || error}
      </Snackbar>
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
  slotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
