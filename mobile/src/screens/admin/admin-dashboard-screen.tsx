import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from '../../components/ui/GlassCard';
import { theme, systemColors } from '../../constants/theme';
import {
  fetchDashboard,
  fetchAdminDoctors,
  approveDoctorApi,
  rejectDoctorApi,
  type DashboardData,
  type AdminDoctor,
} from '../../services/admin.service';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Stat Card ──────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <GlassCard style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Text variant="titleLarge" style={styles.statValue}>
          {value}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          {label}
        </Text>
      </View>
    </GlassCard>
  );
}

// ── Main Screen ────────────────────────────────────────────

export function AdminDashboardScreen() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashData, doctors] = await Promise.all([
        fetchDashboard(),
        fetchAdminDoctors('PENDING'),
      ]);
      setDashboard(dashData);
      setPendingDoctors(doctors);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleApprove = useCallback(
    async (doctor: AdminDoctor) => {
      try {
        await approveDoctorApi(doctor.id);
        Alert.alert('Success', `${doctor.user.name} has been approved.`);
        loadData();
      } catch {
        Alert.alert('Error', 'Failed to approve doctor.');
      }
    },
    [loadData],
  );

  const handleReject = useCallback(
    (doctor: AdminDoctor) => {
      Alert.prompt(
        'Reject Doctor',
        `Provide a reason for rejecting ${doctor.user.name}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async (reason?: string) => {
              if (!reason?.trim()) {
                Alert.alert('Error', 'Rejection reason is required.');
                return;
              }
              try {
                await rejectDoctorApi(doctor.id, reason.trim());
                Alert.alert('Rejected', `${doctor.user.name} has been rejected.`);
                loadData();
              } catch {
                Alert.alert('Error', 'Failed to reject doctor.');
              }
            },
          },
        ],
        'plain-text',
      );
    },
    [loadData],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={systemColors.indigo} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={['#5856D6', '#3634A3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text variant="headlineMedium" style={styles.heroTitle}>
          Admin Dashboard
        </Text>
        <Text variant="bodyMedium" style={styles.heroSub}>
          Manage your healthcare platform
        </Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard
          icon="account-group"
          label="Patients"
          value={dashboard?.totalPatients ?? 0}
          color={systemColors.blue}
        />
        <StatCard
          icon="doctor"
          label="Doctors"
          value={dashboard?.totalDoctors ?? 0}
          color={systemColors.green}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="calendar-check"
          label="Appointments"
          value={dashboard?.appointmentsThisMonth ?? 0}
          color={systemColors.orange}
        />
        <StatCard
          icon="cash-multiple"
          label="Revenue"
          value={`${((dashboard?.revenueThisMonth ?? 0) / 1000).toFixed(0)}K`}
          color={systemColors.indigo}
        />
      </View>

      {/* Cancel Rate & Top Doctors */}
      {dashboard && (
        <GlassCard style={styles.sectionCard}>
          <View>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Monthly Overview
              </Text>
            </View>
            <View style={styles.overviewRow}>
              <Text variant="bodyMedium" style={styles.overviewLabel}>Cancel Rate</Text>
              <Text variant="titleMedium" style={{ color: dashboard.cancelRate > 20 ? systemColors.red : systemColors.green }}>
                {dashboard.cancelRate}%
              </Text>
            </View>
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={[styles.sectionTitle, { marginTop: 8 }]}>
              Top Doctors
            </Text>
            {dashboard.topDoctors.map((doc, i) => (
              <View key={doc.doctorId} style={styles.topDoctorRow}>
                <Text variant="bodyMedium" style={styles.topDoctorRank}>
                  #{i + 1}
                </Text>
                <Text variant="bodyMedium" style={styles.topDoctorName} numberOfLines={1}>
                  {doc.name}
                </Text>
                <Text variant="bodySmall" style={styles.topDoctorCount}>
                  {doc.appointmentCount} appts
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Pending Doctors */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Pending Doctors
          </Text>
          <Text variant="bodySmall" style={styles.badge}>
            {pendingDoctors.length}
          </Text>
        </View>

        {pendingDoctors.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <MaterialCommunityIcons name="check-circle" size={40} color={systemColors.green} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No pending approvals
              </Text>
            </View>
          </GlassCard>
        ) : (
          pendingDoctors.map((doctor) => (
            <GlassCard key={doctor.id} style={styles.doctorCard}>
              <View>
                <View style={styles.doctorHeader}>
                  <View style={styles.doctorInfo}>
                    <Text variant="titleMedium" style={styles.doctorName}>
                      {doctor.user.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.doctorMeta}>
                      {doctor.specialty.name}
                      {doctor.clinic ? ` - ${doctor.clinic.name}` : ''}
                    </Text>
                    <Text variant="bodySmall" style={styles.doctorMeta}>
                      {doctor.user.email}
                    </Text>
                    {doctor.licenseNumber && (
                      <Text variant="bodySmall" style={styles.doctorMeta}>
                        License: {doctor.licenseNumber}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.doctorActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleApprove(doctor)}
                    buttonColor={systemColors.green}
                    textColor="#fff"
                    compact
                    style={styles.actionBtn}
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleReject(doctor)}
                    textColor={systemColors.red}
                    compact
                    style={[styles.actionBtn, { borderColor: systemColors.red }]}
                  >
                    Reject
                  </Button>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick Actions
        </Text>
        <View style={styles.quickLinks}>
          <Pressable style={styles.quickLink} onPress={() => Alert.alert('Coming Soon', 'Clinic management will be available soon.')}>
            <GlassCard style={styles.quickLinkGlass} tintColor={systemColors.indigo} interactive>
              <LinearGradient colors={['#5856D6', '#3634A3']} style={styles.quickLinkGradient}>
                <MaterialCommunityIcons name="hospital-building" size={28} color="#fff" />
                <Text variant="labelLarge" style={styles.quickLinkLabel}>Manage Clinics</Text>
              </LinearGradient>
            </GlassCard>
          </Pressable>
          <Pressable style={styles.quickLink} onPress={() => Alert.alert('Coming Soon', 'Service management will be available soon.')}>
            <GlassCard style={styles.quickLinkGlass} tintColor={systemColors.blue} interactive>
              <LinearGradient colors={['#007AFF', '#0051D5']} style={styles.quickLinkGradient}>
                <MaterialCommunityIcons name="medical-bag" size={28} color="#fff" />
                <Text variant="labelLarge" style={styles.quickLinkLabel}>Manage Services</Text>
              </LinearGradient>
            </GlassCard>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  hero: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
  },
  statContent: {
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statLabel: {
    color: systemColors.gray,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  badge: {
    backgroundColor: systemColors.red,
    color: '#fff',
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  overviewLabel: {
    color: systemColors.gray,
  },
  divider: {
    marginVertical: 4,
  },
  topDoctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  topDoctorRank: {
    fontWeight: '700',
    color: systemColors.indigo,
    width: 28,
  },
  topDoctorName: {
    flex: 1,
    color: theme.colors.onSurface,
  },
  topDoctorCount: {
    color: systemColors.gray,
  },
  emptyCard: {
    borderRadius: 16,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyText: {
    color: systemColors.gray,
  },
  doctorCard: {
    marginBottom: 10,
    borderRadius: 16,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  doctorMeta: {
    color: systemColors.gray,
  },
  doctorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickLink: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickLinkGlass: {
    padding: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickLinkGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  quickLinkLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
