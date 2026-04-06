import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Badge,
  Button,
  Chip,
  FAB,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/ui/GlassCard';
import { systemColors, spacing, theme } from '../../constants/theme';
import {
  getMyMetrics,
  getMyAlerts,
  getHealthTips,
  recordMetric,
  type HealthMetric,
  type HealthMetricType,
  type HealthAlert,
  type HealthTip,
} from '../../services/health.service';

const SCREEN_WIDTH = Dimensions.get('window').width;

const METRIC_CHIPS: Array<{ label: string; type: HealthMetricType }> = [
  { label: 'Blood Pressure', type: 'BLOOD_PRESSURE_SYSTOLIC' },
  { label: 'Weight', type: 'WEIGHT' },
  { label: 'Heart Rate', type: 'HEART_RATE' },
  { label: 'Blood Sugar', type: 'BLOOD_SUGAR' },
];

const METRIC_UNITS: Record<HealthMetricType, string> = {
  BLOOD_PRESSURE_SYSTOLIC: 'mmHg',
  BLOOD_PRESSURE_DIASTOLIC: 'mmHg',
  WEIGHT: 'kg',
  HEIGHT: 'cm',
  BLOOD_SUGAR: 'mg/dL',
  HEART_RATE: 'bpm',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: systemColors.green,
  MEDIUM: systemColors.orange,
  HIGH: systemColors.red,
  CRITICAL: systemColors.red,
};

const TIP_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  heart: 'heart-pulse',
  food: 'food-apple',
  exercise: 'run',
  water: 'water',
  sleep: 'sleep',
};

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

export function HealthScreen() {
  const insets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [selectedType, setSelectedType] = useState<HealthMetricType>('BLOOD_PRESSURE_SYSTOLIC');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<HealthMetricType>('BLOOD_PRESSURE_SYSTOLIC');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [metricsData, alertsData, tipsData] = await Promise.all([
        getMyMetrics({ type: selectedType }),
        getMyAlerts(),
        getHealthTips(),
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setTips(tipsData);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddReading = async () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || numValue <= 0) return;

    setSubmitting(true);
    try {
      await recordMetric({ type: inputType, value: numValue });
      setModalVisible(false);
      setInputValue('');
      fetchData();
    } catch (error) {
      console.error('Failed to record metric:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Prepare chart data
  const chartMetrics = [...metrics].reverse().slice(-10);
  const chartData = {
    labels: chartMetrics.map((m) => {
      const d = new Date(m.recordedAt);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        data: chartMetrics.length > 0 ? chartMetrics.map((m) => Number(m.value)) : [0],
        color: () => systemColors.blue,
        strokeWidth: 2,
      },
    ],
  };

  // Quick stats
  const latestByType = (type: HealthMetricType) => {
    // Search all metrics or fetch separately — for now use what we have
    return metrics.find((m) => m.type === type) ?? null;
  };

  const latestBP = selectedType === 'BLOOD_PRESSURE_SYSTOLIC' ? metrics[0] : null;
  const latestWeight = latestByType('WEIGHT');
  const latestHR = latestByType('HEART_RATE');

  if (loading && metrics.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={systemColors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={[systemColors.blue, '#5856D6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="heart-pulse" size={32} color="#fff" />
            <Text variant="headlineMedium" style={styles.headerTitle}>
              My Health
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Track your vitals and stay healthy
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Stats */}
        <FadeInView delay={100}>
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <View style={styles.statInner}>
                <MaterialCommunityIcons name="heart" size={22} color={systemColors.red} />
                <Text variant="titleMedium" style={styles.statValue}>
                  {latestBP ? Number(latestBP.value).toFixed(0) : '--'}
                </Text>
                <Text variant="labelSmall" style={styles.statLabel}>
                  BP (sys)
                </Text>
              </View>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={styles.statInner}>
                <MaterialCommunityIcons name="scale-bathroom" size={22} color={systemColors.blue} />
                <Text variant="titleMedium" style={styles.statValue}>
                  {latestWeight ? Number(latestWeight.value).toFixed(1) : '--'}
                </Text>
                <Text variant="labelSmall" style={styles.statLabel}>
                  Weight (kg)
                </Text>
              </View>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={styles.statInner}>
                <MaterialCommunityIcons name="pulse" size={22} color={systemColors.green} />
                <Text variant="titleMedium" style={styles.statValue}>
                  {latestHR ? Number(latestHR.value).toFixed(0) : '--'}
                </Text>
                <Text variant="labelSmall" style={styles.statLabel}>
                  Heart Rate
                </Text>
              </View>
            </GlassCard>
          </View>
        </FadeInView>

        {/* Metric Type Selector */}
        <FadeInView delay={200}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {METRIC_CHIPS.map((chip) => (
              <Chip
                key={chip.type}
                selected={selectedType === chip.type}
                onPress={() => setSelectedType(chip.type)}
                style={[
                  styles.chip,
                  selectedType === chip.type && styles.chipSelected,
                ]}
                textStyle={selectedType === chip.type ? styles.chipTextSelected : styles.chipText}
              >
                {chip.label}
              </Chip>
            ))}
          </ScrollView>
        </FadeInView>

        {/* Chart */}
        <FadeInView delay={300}>
          <GlassCard style={styles.chartCard}>
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {METRIC_CHIPS.find((c) => c.type === selectedType)?.label ?? 'Metric'} Trend
              </Text>
              {chartMetrics.length > 1 ? (
                <LineChart
                  data={chartData}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                    color: () => systemColors.blue,
                    labelColor: () => systemColors.gray,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: systemColors.blue,
                    },
                    propsForBackgroundLines: {
                      stroke: systemColors.gray5,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              ) : (
                <View style={styles.emptyChart}>
                  <MaterialCommunityIcons name="chart-line" size={48} color={systemColors.gray3} />
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    Add at least 2 readings to see trends
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>
        </FadeInView>

        {/* Health Alerts */}
        {alerts.length > 0 && (
          <FadeInView delay={400}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Health Alerts
            </Text>
            {alerts.slice(0, 5).map((alert) => (
              <GlassCard key={alert.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <View style={styles.alertLeft}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={24}
                      color={SEVERITY_COLORS[alert.severity]}
                    />
                    <View style={styles.alertTextContainer}>
                      <Text variant="bodyMedium" style={styles.alertMessage}>
                        {alert.message}
                      </Text>
                      <Text variant="labelSmall" style={styles.alertDate}>
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    style={[
                      styles.severityBadge,
                      { backgroundColor: SEVERITY_COLORS[alert.severity] },
                    ]}
                  >
                    {alert.severity}
                  </Badge>
                </View>
              </GlassCard>
            ))}
          </FadeInView>
        )}

        {/* AI Health Tips */}
        {tips.length > 0 && (
          <FadeInView delay={500}>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              AI Health Tips
            </Text>
            {tips.map((tip, index) => (
              <GlassCard key={index} style={styles.tipCard}>
                <View style={styles.tipRow}>
                  <View style={styles.tipIconContainer}>
                    <MaterialCommunityIcons
                      name={TIP_ICONS[tip.icon] ?? 'lightbulb-outline'}
                      size={28}
                      color={systemColors.blue}
                    />
                  </View>
                  <View style={styles.tipTextContainer}>
                    <Text variant="titleSmall" style={styles.tipTitle}>
                      {tip.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.tipText}>
                      {tip.tip}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </FadeInView>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => {
          setInputType(selectedType);
          setModalVisible(true);
        }}
      />

      {/* Add Reading Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text variant="titleLarge" style={styles.modalTitle}>
              Add Reading
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalChips}
            >
              {METRIC_CHIPS.map((chip) => (
                <Chip
                  key={chip.type}
                  selected={inputType === chip.type}
                  onPress={() => setInputType(chip.type)}
                  style={[styles.chip, inputType === chip.type && styles.chipSelected]}
                  textStyle={inputType === chip.type ? styles.chipTextSelected : styles.chipText}
                >
                  {chip.label}
                </Chip>
              ))}
              <Chip
                selected={inputType === 'BLOOD_PRESSURE_DIASTOLIC'}
                onPress={() => setInputType('BLOOD_PRESSURE_DIASTOLIC')}
                style={[
                  styles.chip,
                  inputType === 'BLOOD_PRESSURE_DIASTOLIC' && styles.chipSelected,
                ]}
                textStyle={
                  inputType === 'BLOOD_PRESSURE_DIASTOLIC'
                    ? styles.chipTextSelected
                    : styles.chipText
                }
              >
                BP Diastolic
              </Chip>
              <Chip
                selected={inputType === 'HEIGHT'}
                onPress={() => setInputType('HEIGHT')}
                style={[styles.chip, inputType === 'HEIGHT' && styles.chipSelected]}
                textStyle={inputType === 'HEIGHT' ? styles.chipTextSelected : styles.chipText}
              >
                Height
              </Chip>
            </ScrollView>

            <TextInput
              label={`Value (${METRIC_UNITS[inputType]})`}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.modalInput}
              outlineColor={systemColors.gray4}
              activeOutlineColor={systemColors.blue}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAddReading}
                loading={submitting}
                disabled={submitting || !inputValue}
                style={styles.modalBtn}
                buttonColor={systemColors.blue}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  // Header
  header: {
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Quick Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: -20,
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statInner: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  statLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  // Chips
  chipsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 8,
  },
  chip: {
    backgroundColor: systemColors.gray6,
    marginRight: 6,
  },
  chipSelected: {
    backgroundColor: systemColors.blue,
  },
  chipText: {
    color: theme.colors.onSurface,
  },
  chipTextSelected: {
    color: '#fff',
  },
  // Chart
  chartCard: {
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },
  emptyChart: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Alerts
  sectionHeader: {
    fontWeight: '600',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: theme.colors.onSurface,
  },
  alertCard: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertMessage: {
    color: theme.colors.onSurface,
  },
  alertDate: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  severityBadge: {
    color: '#fff',
    fontWeight: '600',
  },
  // Tips
  tipCard: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  tipText: {
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: systemColors.blue,
    borderRadius: 28,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: systemColors.gray4,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: spacing.md,
    color: theme.colors.onSurface,
  },
  modalChips: {
    gap: 6,
    marginBottom: spacing.md,
  },
  modalInput: {
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
  },
});
