import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, List, Text } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { theme } from '../../constants/theme';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenBackground>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Avatar.Text size={80} label={initials} style={styles.avatar} />
        <Text variant="headlineSmall" style={styles.name}>
          {user?.name ?? 'User'}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email}
        </Text>
        <View style={styles.roleBadge}>
          <Text variant="labelSmall" style={styles.roleText}>
            {user?.role}
          </Text>
        </View>
      </View>

      <GlassCard style={styles.card}>
        <View>
          <List.Item
            title="Phone"
            description={user?.phone ?? 'Not set'}
            left={(props) => <List.Icon {...props} icon="phone" />}
          />
          <Divider />
          <List.Item
            title="Address"
            description={user?.address ?? 'Not set'}
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
          <Divider />
          <List.Item
            title="Insurance ID"
            description={user?.insuranceId ?? 'Not set'}
            left={(props) => <List.Icon {...props} icon="card-account-details" />}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <View>
          <List.Item
            title="Medical History"
            description="Your completed visits"
            left={(props) => <List.Icon {...props} icon="history" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/medical-history')}
          />
          <Divider />
          <List.Item
            title="Health Tracking"
            description="Monitor your vitals"
            left={(props) => <List.Icon {...props} icon="heart-pulse" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/health')}
          />
          <Divider />
          <List.Item
            title="Scan Prescription"
            description="OCR medicine extraction"
            left={(props) => <List.Icon {...props} icon="camera-document" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/ocr')}
          />
          <Divider />
          <List.Item
            title="Notifications"
            description="View your notifications"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/notifications')}
          />
          <Divider />
          <List.Item
            title="Payment History"
            description="View your payments"
            left={(props) => <List.Icon {...props} icon="credit-card-clock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/payment-history')}
          />
          <Divider />
          {user?.role === 'ADMIN' && (
            <>
              <List.Item
                title="Admin Dashboard"
                description="Manage platform"
                left={(props) => <List.Icon {...props} icon="shield-crown" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => router.push('/admin')}
              />
              <Divider />
            </>
          )}
          <List.Item
            title="Edit Profile"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/edit-profile')}
          />
          <Divider />
          <List.Item
            title="Change Password"
            left={(props) => <List.Icon {...props} icon="lock-reset" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
          <Divider />
          <List.Item
            title="Settings"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        </View>
      </GlassCard>

      <Button
        mode="outlined"
        onPress={handleLogout}
        icon="logout"
        textColor={theme.colors.error}
        style={styles.logoutBtn}
      >
        Logout
      </Button>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 6,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  name: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  email: {
    color: 'rgba(255,255,255,0.8)',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderColor: theme.colors.error,
    borderRadius: 12,
  },
});
