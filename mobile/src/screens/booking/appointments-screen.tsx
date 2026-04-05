import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Snackbar, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useMyAppointments } from '../../hooks/use-my-appointments';
import { theme } from '../../constants/theme';

function formatDate(value?: string) {
  if (!value) {
    return 'Unknown date';
  }

  return new Date(value).toLocaleDateString();
}

export function AppointmentsScreen() {
  const { appointments, isLoading, error, reload, cancelById } = useMyAppointments();
  const [notice, setNotice] = useState('');

  async function handleCancel(id: string) {
    try {
      await cancelById(id);
      setNotice('Appointment canceled.');
    } catch (cancelError) {
      if (cancelError && typeof cancelError === 'object' && 'response' in cancelError) {
        const response = (cancelError as { response?: { data?: { error?: { message?: string } } } }).response;
        setNotice(response?.data?.error?.message ?? 'Could not cancel appointment.');
      } else {
        setNotice('Could not cancel appointment.');
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          My appointments
        </Text>
        <View style={styles.actions}>
          <Button mode="text" onPress={() => void reload()}>
            Refresh
          </Button>
          <Button mode="text" onPress={() => router.push('/home')}>
            Home
          </Button>
        </View>
      </View>

      {appointments.length > 0 ? (
        appointments.map((appointment) => (
          <Card key={appointment.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">{appointment.doctor?.name ?? 'Doctor'}</Text>
              <Text variant="bodyMedium">
                {appointment.doctor?.specialty.name ?? 'Specialty'} • {appointment.status}
              </Text>
              <Text variant="bodyMedium">
                {formatDate(appointment.timeSlot?.date)} • {appointment.timeSlot?.startTime} -{' '}
                {appointment.timeSlot?.endTime}
              </Text>
              <Text variant="bodyMedium">
                Total: {appointment.totalAmount.toLocaleString()} VND
              </Text>

              {appointment.status === 'PENDING' || appointment.status === 'CONFIRMED' ? (
                <Button mode="outlined" onPress={() => void handleCancel(appointment.id)}>
                  Cancel appointment
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        ))
      ) : (
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="bodyMedium">
              {isLoading ? 'Loading appointments...' : 'No appointments yet.'}
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
    gap: 12,
  },
  title: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
