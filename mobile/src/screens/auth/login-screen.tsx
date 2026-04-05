import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Snackbar, Text, TextInput } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { theme } from '../../constants/theme';

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return response?.data?.error?.message ?? 'Login failed. Please try again.';
  }

  return 'Login failed. Please try again.';
}

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('patient1@gmail.com');
  const [password, setPassword] = useState('password123');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login(email.trim(), password);
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
          <Text variant="headlineMedium" style={styles.title}>
            BTL Healthcare
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to manage appointments, doctors, and care history.
          </Text>
        </View>

        <View style={styles.card}>
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

          <Button mode="contained" onPress={handleLogin} loading={submitting} disabled={submitting}>
            Sign in
          </Button>

          <HelperText type="info" visible>
            Demo account: patient1@gmail.com / password123
          </HelperText>

          <View style={styles.footer}>
            <Text variant="bodyMedium">Need an account?</Text>
            <Link href="/register" asChild>
              <Button mode="text" compact>
                Register
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
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    gap: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
