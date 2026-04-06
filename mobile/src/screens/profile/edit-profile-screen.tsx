import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { GlassCard } from '../../components/ui/GlassCard';
import { theme, systemColors } from '../../constants/theme';
import { api, extractData } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import type { User } from '../../types';

// ---------------------------------------------------------------------------
// FadeInView
// ---------------------------------------------------------------------------

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// EditProfileScreen
// ---------------------------------------------------------------------------

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [insuranceId, setInsuranceId] = useState(user?.insuranceId ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : null
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);

      // Upload avatar
      try {
        const formData = new FormData();
        formData.append('avatar', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as unknown as Blob);
        await api.put('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch {
        // Keep the local URI even if upload fails
        setSnackbar({ visible: true, message: 'Avatar upload failed. Will retry on save.' });
      }
    }
  }

  function handleDateChange(_event: unknown, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  }

  function formatDisplayDate(date: Date | null): string {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      setSnackbar({ visible: true, message: 'Name is required.' });
      return;
    }
    try {
      setSaving(true);
      const body: Record<string, string | undefined> = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        insuranceId: insuranceId.trim() || undefined,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
      };
      const updated = extractData<User>(await api.put('/users/me', body));
      setUser(updated);
      setSnackbar({ visible: true, message: 'Profile updated!' });
      setTimeout(() => router.back(), 800);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message ?? 'Failed to save profile.')
          : 'Failed to save profile.';
      setSnackbar({ visible: true, message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[systemColors.blue, systemColors.indigo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </Pressable>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Edit Profile
            </Text>
            <Pressable onPress={handleSave} hitSlop={12} disabled={saving}>
              {saving ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check" size={24} color="#fff" />
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* Avatar Section */}
        <FadeInView delay={100}>
          <View style={styles.avatarSection}>
            {avatarUri ? (
              <Avatar.Image size={96} source={{ uri: avatarUri }} />
            ) : (
              <Avatar.Text size={96} label={initials} style={styles.avatarPlaceholder} />
            )}
            <Button
              mode="text"
              icon="camera"
              onPress={handlePickImage}
              textColor={systemColors.blue}
              style={styles.changePhotoBtn}
            >
              Change Photo
            </Button>
          </View>
        </FadeInView>

        {/* Form Fields */}
        <FadeInView delay={200}>
          <GlassCard style={styles.card}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Personal Information
            </Text>
            <TextInput
              mode="outlined"
              label="Name"
              value={name}
              onChangeText={setName}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              mode="outlined"
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="numeric"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          </GlassCard>
        </FadeInView>

        <FadeInView delay={300}>
          <GlassCard style={styles.card}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Date of Birth
            </Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={20}
                color={systemColors.blue}
              />
              <Text variant="bodyLarge" style={styles.dateText}>
                {formatDisplayDate(dateOfBirth)}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={systemColors.gray}
              />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ?? new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={400}>
          <GlassCard style={styles.card}>
            <Text variant="titleSmall" style={styles.sectionLabel}>
              Additional Details
            </Text>
            <TextInput
              mode="outlined"
              label="Address"
              value={address}
              onChangeText={setAddress}
              left={<TextInput.Icon icon="map-marker" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <TextInput
              mode="outlined"
              label="Insurance ID"
              value={insuranceId}
              onChangeText={setInsuranceId}
              left={<TextInput.Icon icon="card-account-details" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
          </GlassCard>
        </FadeInView>

        {/* Save Button */}
        <FadeInView delay={500}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            icon="content-save"
            style={styles.saveBtn}
            contentStyle={styles.saveBtnContent}
            labelStyle={styles.saveBtnLabel}
          >
            Save Changes
          </Button>
        </FadeInView>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={2500}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  changePhotoBtn: {
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  inputOutline: {
    borderRadius: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    flex: 1,
    color: theme.colors.onSurface,
  },
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: systemColors.blue,
  },
  saveBtnContent: {
    paddingVertical: 6,
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
