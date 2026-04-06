import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } })
      .response;
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

  // ── Animated values ──────────────────────────────────────────────
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(-30)).current;
  const formItems = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const formSlides = useRef([
    new Animated.Value(40),
    new Animated.Value(40),
    new Animated.Value(40),
    new Animated.Value(40),
    new Animated.Value(40),
  ]).current;

  useEffect(() => {
    // Hero fade-in
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered form fields
    const staggerAnimations = formItems.map((opacity, index) =>
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay: 300 + index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(formSlides[index], {
          toValue: 0,
          duration: 400,
          delay: 300 + index * 100,
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(staggerAnimations).start();
  }, []);

  async function handleLogin(): Promise<void> {
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

  function renderAnimatedItem(index: number, child: React.ReactNode): React.ReactNode {
    return (
      <Animated.View
        key={index}
        style={{
          opacity: formItems[index],
          transform: [{ translateY: formSlides[index] }],
        }}
      >
        {child}
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient Hero ─────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroContainer,
            { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
          ]}
        >
          <LinearGradient
            colors={['#007AFF', '#0051D5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.lottieWrapper}>
              <LottieView
                source={require('../../assets/animations/medical-hero.json')}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>
            <Text variant="headlineMedium" style={styles.heroTitle}>
              BTL Healthcare
            </Text>
            <Text variant="bodyMedium" style={styles.heroSubtitle}>
              Sign in to manage appointments, doctors, and care history.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Form Card ─────────────────────────────────────────── */}
        <View style={styles.card}>
          {renderAnimatedItem(
            0,
            <TextInput
              label="Email"
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />,
          )}

          {renderAnimatedItem(
            1,
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry={secureTextEntry}
              value={password}
              onChangeText={setPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecureTextEntry((v) => !v)}
                />
              }
              style={styles.input}
            />,
          )}

          {renderAnimatedItem(
            2,
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={submitting}
              disabled={submitting}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              style={styles.loginButton}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>,
          )}

          {renderAnimatedItem(
            3,
            <View style={styles.demoHint}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.demoText}>
                Demo: patient1@gmail.com / password123
              </Text>
            </View>,
          )}

          {renderAnimatedItem(
            4,
            <View style={styles.footer}>
              <Text variant="bodyMedium" style={styles.footerText}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text variant="labelLarge" style={styles.footerLink}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>,
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={Boolean(error)}
        onDismiss={() => setError('')}
        duration={4000}
        action={{ label: 'OK', onPress: () => setError('') }}
        style={styles.snackbar}
      >
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
  scrollContent: {
    flexGrow: 1,
  },
  // ── Hero ──────────────────────────────────────────────────────────
  heroContainer: {
    overflow: 'hidden',
  },
  gradient: {
    width: SCREEN_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  lottieWrapper: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 32,
  },
  // ── Card ──────────────────────────────────────────────────────────
  card: {
    marginTop: -16,
    marginHorizontal: 20,
    padding: 24,
    gap: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    marginBottom: 32,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  // ── Button ────────────────────────────────────────────────────────
  loginButton: {
    marginTop: 4,
    borderRadius: 12,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  // ── Demo hint ─────────────────────────────────────────────────────
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  demoText: {
    color: theme.colors.onSurfaceVariant,
  },
  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  footerText: {
    color: theme.colors.onSurfaceVariant,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // ── Snackbar ──────────────────────────────────────────────────────
  snackbar: {
    backgroundColor: theme.colors.error,
  },
});
