import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Snackbar, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { theme } from '../../constants/theme';
import { getSpecialties, getClinics } from '../../services/specialties.service';
import {
  createAppointment,
  getAvailableSlots,
  type AvailableSlot,
} from '../../services/appointments.service';
import type { Specialty, Clinic } from '../../types';

function getTodayDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? 'Something went wrong.';
  }
  return 'Something went wrong.';
}

export function BookingScreen() {
  // Step 1: specialty
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Step 2: clinic (optional)
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');

  // Step 3: date + slots
  const [date, setDate] = useState(getTodayDate());
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState('');

  // Notes + state
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Load specialties + clinics on mount
  useEffect(() => {
    Promise.all([getSpecialties(), getClinics()])
      .then(([specs, cls]) => {
        setSpecialties(specs);
        setClinics(cls);
      })
      .catch(() => setNotice('Could not load data'));
  }, []);

  // Load available slots when specialty + date change
  const loadSlots = useCallback(async () => {
    if (!selectedSpecialty || !date) return;
    setLoading(true);
    setSelectedTime('');
    try {
      const result = await getAvailableSlots({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
      });
      setSlots(result);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSpecialty, selectedClinic, date]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function handleBook() {
    if (!selectedSpecialty || !selectedTime) {
      setNotice('Please select a specialty and time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({
        specialtyId: selectedSpecialty,
        clinicId: selectedClinic || undefined,
        date,
        startTime: selectedTime,
        serviceIds: [],
        notes: notes.trim() || undefined,
      });
      router.replace('/appointments');
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSpecObj = specialties.find((s) => s.id === selectedSpecialty);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Button icon="arrow-left" mode="text" onPress={() => router.back()}>
          Back
        </Button>
        <Text variant="headlineSmall" style={styles.title}>
          Book appointment
        </Text>
      </View>

      {/* Step 1: Specialty */}
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.stepTitle}>
            1. Select specialty
          </Text>
          <View style={styles.chipList}>
            {specialties.map((spec) => (
              <Chip
                key={spec.id}
                selected={selectedSpecialty === spec.id}
                onPress={() => setSelectedSpecialty(spec.id)}
                style={styles.chip}
              >
                {spec.name}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Step 2: Clinic (optional) */}
      {selectedSpecialty ? (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.stepTitle}>
              2. Clinic (optional)
            </Text>
            <View style={styles.chipList}>
              <Chip
                selected={selectedClinic === ''}
                onPress={() => setSelectedClinic('')}
                style={styles.chip}
              >
                Any clinic
              </Chip>
              {clinics.map((clinic) => (
                <Chip
                  key={clinic.id}
                  selected={selectedClinic === clinic.id}
                  onPress={() => setSelectedClinic(clinic.id)}
                  style={styles.chip}
                >
                  {clinic.name}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {/* Step 3: Date */}
      {selectedSpecialty ? (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.stepTitle}>
              3. Select date
            </Text>
            <TextInput
              mode="outlined"
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
            />
          </Card.Content>
        </Card>
      ) : null}

      {/* Step 4: Time slots */}
      {selectedSpecialty && date ? (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.stepTitle}>
              4. Available time slots
            </Text>
            {loading ? (
              <Text variant="bodyMedium">Loading slots...</Text>
            ) : slots.length > 0 ? (
              <View style={styles.chipList}>
                {slots.map((slot) => (
                  <Chip
                    key={slot.startTime}
                    selected={selectedTime === slot.startTime}
                    onPress={() => setSelectedTime(slot.startTime)}
                    style={styles.chip}
                  >
                    {slot.startTime} - {slot.endTime} ({slot.availableCount} avail.)
                  </Chip>
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium">No slots available for this date.</Text>
            )}
          </Card.Content>
        </Card>
      ) : null}

      {/* Step 5: Notes + Confirm */}
      {selectedTime ? (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.stepTitle}>
              5. Confirm booking
            </Text>
            <Text variant="bodyMedium" style={styles.summary}>
              {selectedSpecObj?.name} • {date} • {selectedTime}
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={3}
              label="Notes / symptoms (optional)"
              value={notes}
              onChangeText={setNotes}
            />
            <Button
              mode="contained"
              onPress={handleBook}
              loading={submitting}
              disabled={submitting}
            >
              Confirm booking
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      <Snackbar visible={Boolean(notice)} onDismiss={() => setNotice('')} duration={3000}>
        {notice}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    backgroundColor: theme.colors.background,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.primary,
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
  stepTitle: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  summary: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
