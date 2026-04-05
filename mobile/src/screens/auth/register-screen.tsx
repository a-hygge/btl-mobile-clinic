import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { theme } from '../../constants/theme';
import { HealthPulse } from '../../components/health-pulse';

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message ?? 'Registration failed. Please try again.';
  }

  return 'Registration failed. Please try again.';
}

export function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      router.replace('/home');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroVisual}>
            <View style={styles.heroGlow} />
            <HealthPulse size={136} />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            Create account
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Start with a patient account. Doctor onboarding can be extended later.
          </Text>
        </View>

        <View style={styles.card}>
          <TextInput
            label="Full name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            label="Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry={secureTextEntry}
            value={password}
            onChangeText={setPassword}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye-off' : 'eye'}
                onPress={() => setSecureTextEntry((value) => !value)}
              />
            }
            style={styles.input}
          />

          <View style={styles.roleBlock}>
            <Text variant="labelLarge" style={styles.roleLabel}>
              Account type
            </Text>
            <SegmentedButtons
              value={role}
              onValueChange={(value) => setRole(value as 'PATIENT' | 'DOCTOR')}
              buttons={[
                { value: 'PATIENT', label: 'Patient' },
                { value: 'DOCTOR', label: 'Doctor' },
              ]}
            />
          </View>

          <Button mode="contained" onPress={handleRegister} loading={submitting} disabled={submitting}>
            Create account
          </Button>

          <HelperText type="info" visible>
            The backend contract can extend doctor verification later.
          </HelperText>

          <View style={styles.footer}>
            <Text variant="bodyMedium">Already have an account?</Text>
            <Link href="/login" asChild>
              <Button mode="text" compact>
                Sign in
              </Button>
            </Link>
          </View>
        </View>
      </ScrollView>

      <Snackbar visible={Boolean(error)} onDismiss={() => setError('')}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 20,
  },
  hero: {
    gap: 8,
    alignItems: 'center',
  },
  heroVisual: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: theme.colors.secondaryContainer,
    opacity: 0.7,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    gap: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  roleBlock: {
    gap: 8,
  },
  roleLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
