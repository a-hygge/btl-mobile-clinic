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

type Role = 'PATIENT' | 'DOCTOR';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } })
      .response;
    return response?.data?.error?.message ?? 'Registration failed. Please try again.';
  }
  return 'Registration failed. Please try again.';
}

// ── Animated role chip ────────────────────────────────────────────────
interface RoleChipProps {
  label: string;
  icon: 'account' | 'stethoscope';
  active: boolean;
  onPress: () => void;
}

function RoleChip({ label, icon, active, onPress }: RoleChipProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.chip,
          active && styles.chipActive,
          { transform: [{ scale }] },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={active ? '#FFFFFF' : theme.colors.primary}
        />
        <Text
          variant="labelLarge"
          style={[styles.chipLabel, active && styles.chipLabelActive]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export function RegisterScreen() {
  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PATIENT');
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
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const formSlides = useRef([
    new Animated.Value(40),
    new Animated.Value(40),
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

  async function handleRegister(): Promise<void> {
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
        {/* ── Gradient Hero (compact) ──────────────────────────── */}
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
              Create Account
            </Text>
            <Text variant="bodyMedium" style={styles.heroSubtitle}>
              Join BTL Healthcare and start managing your care today.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Form Card ────────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Role selection */}
          {renderAnimatedItem(
            0,
            <View style={styles.roleSection}>
              <Text variant="labelLarge" style={styles.roleTitle}>
                I am a
              </Text>
              <View style={styles.roleRow}>
                <RoleChip
                  label="Patient"
                  icon="account"
                  active={role === 'PATIENT'}
                  onPress={() => setRole('PATIENT')}
                />
                <RoleChip
                  label="Doctor"
                  icon="stethoscope"
                  active={role === 'DOCTOR'}
                  onPress={() => setRole('DOCTOR')}
                />
              </View>
            </View>,
          )}

          {renderAnimatedItem(
            1,
            <TextInput
              label="Full Name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
            />,
          )}

          {renderAnimatedItem(
            2,
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
            3,
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
            4,
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={submitting}
              disabled={submitting}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              style={styles.registerButton}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </Button>,
          )}

          {renderAnimatedItem(
            5,
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={16}
                color={theme.colors.secondary}
              />
              <Text variant="bodySmall" style={styles.infoText}>
                Your data is securely encrypted and protected.
              </Text>
            </View>,
          )}

          {renderAnimatedItem(
            6,
            <View style={styles.footer}>
              <Text variant="bodyMedium" style={styles.footerText}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text variant="labelLarge" style={styles.footerLink}>
                  Login
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
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  lottieWrapper: {
    width: 140,
    height: 140,
    marginBottom: 8,
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
  // ── Role chips ────────────────────────────────────────────────────
  roleSection: {
    gap: 10,
  },
  roleTitle: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipLabel: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  // ── Button ────────────────────────────────────────────────────────
  registerButton: {
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
  // ── Info row ──────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoText: {
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
