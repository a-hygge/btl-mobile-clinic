/**
 * AppointmentCard - Appointment card with border-left + status chip + date/time row
 * Matches Figma `div.appt-card` pattern.
 */
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { figmaColors, figmaFonts, figmaRadius, figmaShadows } from '../../constants/theme';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';

interface AppointmentCardProps {
  doctorName: string;
  specialty: string;
  date: string; // formatted date string e.g. "28/02/2026"
  startTime: string; // "14:00"
  endTime?: string; // "14:30"
  status: AppointmentStatus;
  avatarText?: string;
  avatarBgColor?: string;
  avatarTextColor?: string;
  onPress?: () => void;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELED: 'Đã hủy',
};

const STATUS_COLORS: Record<AppointmentStatus, { color: string; bg: string; border: string }> = {
  PENDING: { color: '#F57C00', bg: '#FFF3E0', border: '#FB8C00' },
  CONFIRMED: { color: figmaColors.success, bg: figmaColors.successBg, border: figmaColors.success },
  COMPLETED: { color: figmaColors.info, bg: figmaColors.infoBg, border: figmaColors.info },
  CANCELED: { color: figmaColors.error, bg: figmaColors.errorBg, border: figmaColors.error },
};

export function AppointmentCard({
  doctorName,
  specialty,
  date,
  startTime,
  endTime,
  status,
  avatarText,
  avatarBgColor = figmaColors.pastelBlue,
  avatarTextColor = figmaColors.primary,
  onPress,
}: AppointmentCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 8, tension: 200 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };

  const initials = avatarText || doctorName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const statusCfg = STATUS_COLORS[status];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={[styles.card, { borderLeftColor: statusCfg.border }]}>
          <View style={styles.topRow}>
            <View style={styles.left}>
              <View style={[styles.avatar, { backgroundColor: avatarBgColor }]}>
                <Text style={[styles.avatarText, { color: avatarTextColor }]}>{initials}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{doctorName}</Text>
                <Text style={styles.specialty} numberOfLines={1}>{specialty}</Text>
              </View>
            </View>
            <View style={[styles.chip, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.chipText, { color: statusCfg.color }]}>{STATUS_LABELS[status]}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={styles.metaText}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🕐</Text>
              <Text style={styles.metaText}>
                {startTime}
                {endTime ? ` - ${endTime}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: figmaColors.surface,
    borderRadius: figmaRadius.lg,
    borderLeftWidth: 4,
    paddingVertical: 16,
    paddingLeft: 20,
    paddingRight: 16,
    gap: 12,
    ...figmaShadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: figmaRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: figmaFonts.sizes.md,
    fontWeight: figmaFonts.weights.bold,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: figmaFonts.sizes.lg,
    fontWeight: figmaFonts.weights.semibold,
    color: figmaColors.textPrimary,
  },
  specialty: {
    fontSize: figmaFonts.sizes.base,
    color: figmaColors.textSecondary,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: figmaRadius.pill,
  },
  chipText: {
    fontSize: figmaFonts.sizes.sm,
    fontWeight: figmaFonts.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: figmaColors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: figmaFonts.sizes.lg,
  },
  metaText: {
    fontSize: figmaFonts.sizes.base,
    color: figmaColors.textPrimary,
  },
});
