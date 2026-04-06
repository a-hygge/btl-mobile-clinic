import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme, systemColors } from '../../constants/theme';
import {
  getPaymentHistory,
  type PaymentWithDetails,
} from '../../services/payment.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN = systemColors.green;
const GREEN_DARK = '#248A3D';

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  PENDING: { color: systemColors.orange, icon: 'clock-outline', label: 'Pending' },
  PAID: { color: GREEN, icon: 'check-circle', label: 'Paid' },
  FAILED: { color: systemColors.red, icon: 'close-circle', label: 'Failed' },
  REFUNDED: { color: systemColors.purple, icon: 'undo', label: 'Refunded' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  VNPAY: 'VNPAY',
  MOMO: 'Momo',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Payment card component
// ---------------------------------------------------------------------------

function PaymentCard({ item }: { item: PaymentWithDetails }) {
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;

  return (
    <GlassCard style={styles.paymentCard}>
      <View style={styles.cardContent}>
        {/* Header row: doctor + status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.doctorInfo}>
            <MaterialCommunityIcons name="doctor" size={20} color={GREEN} />
            <Text variant="titleSmall" style={styles.doctorName}>
              {item.appointment.doctor.name}
            </Text>
          </View>
          <Chip
            icon={() => (
              <MaterialCommunityIcons
                name={status.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={14}
                color={status.color}
              />
            )}
            style={[styles.statusChip, { backgroundColor: `${status.color}15` }]}
            textStyle={{ color: status.color, fontSize: 12, fontWeight: '600' }}
          >
            {status.label}
          </Chip>
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="stethoscope" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.appointment.doctor.specialty.name}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.appointment.timeSlot.date}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.appointment.timeSlot.startTime}
            </Text>
          </View>
        </View>

        {/* Footer: method + amount */}
        <View style={styles.cardFooter}>
          <View style={styles.methodBadge}>
            <MaterialCommunityIcons
              name={item.method === 'CASH' ? 'cash' : item.method === 'VNPAY' ? 'credit-card-outline' : 'wallet-outline'}
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.methodText}>
              {METHOD_LABELS[item.method]}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.amount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {/* Created date */}
        <Text variant="bodySmall" style={styles.dateText}>
          {formatDate(item.createdAt)}
        </Text>
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const data = await getPaymentHistory();
      setPayments(data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPayments();
  }, [loadPayments]);

  return (
    <ScreenBackground>
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[GREEN, GREEN_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Button icon="arrow-left" mode="text" onPress={() => router.back()} textColor="#fff">
            Back
          </Button>
        </View>
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSubtitle}>
          {payments.length} payment{payments.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentCard item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GREEN} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="receipt" size={64} color={systemColors.gray3} />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No payments yet
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Your payment history will appear here
              </Text>
            </View>
          ) : null
        }
      />
    </View>
    </ScreenBackground>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 20,
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  paymentCard: {
    marginBottom: 4,
  },
  cardContent: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  doctorName: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statusChip: {
    height: 28,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: theme.colors.onSurfaceVariant,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline + '30',
    paddingTop: 10,
    marginTop: 2,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${theme.colors.outline}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodText: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  amount: {
    fontWeight: '800',
    color: GREEN,
  },
  dateText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  emptySubtext: {
    color: theme.colors.outline,
  },
});
