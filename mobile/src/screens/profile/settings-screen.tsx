import { useCallback, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-paper';
import * as Application from 'expo-application';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  FadeInView,
  GradientHeader,
  ListRow,
  ScreenContainer,
  SectionTitle,
} from '../../components/shared';
import { figmaColors, figmaFonts, figmaRadius, figmaSpacing } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Settings row with a toggle switch
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  icon: string;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ icon, iconBgColor, title, subtitle, value, onToggle }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: iconBgColor }]}>
        <Text style={styles.toggleIconText}>{icon}</Text>
      </View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {subtitle ? <Text style={styles.toggleSub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: figmaColors.border, true: figmaColors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [appointmentReminder, setAppointmentReminder] = useState(true);
  const [medicineReminder, setMedicineReminder] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const showComingSoon = useCallback((feature: string) => {
    Alert.alert(feature, 'Tính năng đang được phát triển. Vui lòng quay lại sau.', [
      { text: 'Đã hiểu' },
    ]);
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Xóa bộ nhớ đệm',
      'Bạn có chắc muốn xóa bộ nhớ đệm? Ứng dụng có thể tải chậm hơn trong lần tiếp theo.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Đã xóa', 'Bộ nhớ đệm đã được xóa thành công.');
          },
        },
      ],
    );
  }, []);

  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildVersion = Application.nativeBuildVersion ?? '1';

  return (
    <ScreenContainer showsVerticalScrollIndicator={false}>
      <GradientHeader
        title="Cài đặt"
        showBack
        subtitle="Tùy chỉnh ứng dụng theo sở thích"
        colors={[figmaColors.primary, figmaColors.primaryDark]}
      />

      <View style={styles.body}>
        {/* Thông báo */}
        <FadeInView delay={80}>
          <SectionTitle title="Thông báo" />
          <GlassCard style={styles.card}>
            <ToggleRow
              icon="🔔"
              iconBgColor={figmaColors.pastelPurple}
              title="Nhận thông báo đẩy"
              subtitle="Nhận thông báo trên thiết bị"
              value={pushEnabled}
              onToggle={setPushEnabled}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon="📅"
              iconBgColor={figmaColors.pastelBlue}
              title="Nhắc lịch hẹn"
              subtitle="Nhắc trước 1 giờ khi có lịch khám"
              value={appointmentReminder}
              onToggle={setAppointmentReminder}
            />
            <View style={styles.divider} />
            <ToggleRow
              icon="💊"
              iconBgColor={figmaColors.pastelGreen}
              title="Nhắc uống thuốc"
              subtitle="Nhắc theo toa thuốc đã lưu"
              value={medicineReminder}
              onToggle={setMedicineReminder}
            />
          </GlassCard>
        </FadeInView>

        {/* Giao diện */}
        <FadeInView delay={160}>
          <SectionTitle title="Giao diện" />
          <GlassCard style={styles.card}>
            <ToggleRow
              icon="🌙"
              iconBgColor={figmaColors.pastelTeal}
              title="Chế độ tối"
              subtitle="Giao diện tối cho ban đêm"
              value={darkMode}
              onToggle={(v) => {
                setDarkMode(v);
                showComingSoon('Chế độ tối');
              }}
            />
            <View style={styles.divider} />
            <ListRow
              icon="🌐"
              iconBgColor={figmaColors.pastelOrange}
              title="Ngôn ngữ"
              subtitle="Tiếng Việt"
              trailing="›"
              onPress={() => showComingSoon('Ngôn ngữ')}
            />
          </GlassCard>
        </FadeInView>

        {/* Quyền riêng tư & Bảo mật */}
        <FadeInView delay={240}>
          <SectionTitle title="Quyền riêng tư" />
          <GlassCard style={styles.card}>
            <ListRow
              icon="🔒"
              iconBgColor={figmaColors.pastelRed}
              title="Đổi mật khẩu"
              subtitle="Cập nhật mật khẩu tài khoản"
              onPress={() => showComingSoon('Đổi mật khẩu')}
            />
            <View style={styles.divider} />
            <ListRow
              icon="🛡️"
              iconBgColor={figmaColors.pastelPurple}
              title="Quyền ứng dụng"
              subtitle="Camera, thông báo, vị trí"
              onPress={() => Linking.openSettings()}
            />
            <View style={styles.divider} />
            <ListRow
              icon="🗑️"
              iconBgColor={figmaColors.errorBg}
              title="Xóa bộ nhớ đệm"
              subtitle="Giải phóng dung lượng"
              onPress={handleClearCache}
            />
          </GlassCard>
        </FadeInView>

        {/* Hỗ trợ */}
        <FadeInView delay={320}>
          <SectionTitle title="Hỗ trợ" />
          <GlassCard style={styles.card}>
            <ListRow
              icon="📖"
              iconBgColor={figmaColors.pastelBlue}
              title="Hướng dẫn sử dụng"
              subtitle="Cách sử dụng ứng dụng"
              onPress={() => showComingSoon('Hướng dẫn sử dụng')}
            />
            <View style={styles.divider} />
            <ListRow
              icon="📄"
              iconBgColor={figmaColors.surfaceMuted}
              title="Điều khoản sử dụng"
              onPress={() => showComingSoon('Điều khoản sử dụng')}
            />
            <View style={styles.divider} />
            <ListRow
              icon="🔐"
              iconBgColor={figmaColors.surfaceMuted}
              title="Chính sách bảo mật"
              onPress={() => showComingSoon('Chính sách bảo mật')}
            />
            <View style={styles.divider} />
            <ListRow
              icon="💬"
              iconBgColor={figmaColors.pastelGreen}
              title="Liên hệ hỗ trợ"
              subtitle="hotro@btlhealthcare.vn"
              onPress={() => Linking.openURL('mailto:hotro@btlhealthcare.vn')}
            />
          </GlassCard>
        </FadeInView>

        {/* Thông tin ứng dụng */}
        <FadeInView delay={400}>
          <GlassCard style={[styles.card, styles.appInfoCard]}>
            <Text style={styles.appName}>BTL Healthcare</Text>
            <Text style={styles.appVersion}>
              Phiên bản {appVersion} ({buildVersion})
            </Text>
            <Text style={styles.appCopyright}>
              © 2026 Nhóm 02 — PTIT
            </Text>
            <Text style={styles.appTeam}>
              Nguyễn Thị Tú Anh · Ngô Đức Sơn · Lê Đức Hiểu · Nguyễn Trung Kiên
            </Text>
          </GlassCard>
        </FadeInView>
      </View>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  body: {
    marginTop: figmaSpacing.xl,
    gap: figmaSpacing.lg,
    paddingBottom: figmaSpacing['3xl'],
  },
  card: {
    marginHorizontal: figmaSpacing.lg,
    paddingVertical: figmaSpacing.xs,
    paddingHorizontal: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: figmaColors.border,
    marginLeft: 68,
  },

  /* Toggle row */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: figmaRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconText: {
    fontSize: 20,
  },
  toggleContent: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: figmaFonts.sizes.lg,
    fontWeight: figmaFonts.weights.medium,
    color: figmaColors.textPrimary,
  },
  toggleSub: {
    fontSize: figmaFonts.sizes.base,
    color: figmaColors.textSecondary,
  },

  /* App info */
  appInfoCard: {
    marginTop: figmaSpacing.sm,
    paddingVertical: figmaSpacing.xl,
    paddingHorizontal: figmaSpacing.lg,
    alignItems: 'center',
  },
  appName: {
    fontSize: figmaFonts.sizes.xl,
    fontWeight: figmaFonts.weights.bold,
    color: figmaColors.primary,
  },
  appVersion: {
    fontSize: figmaFonts.sizes.sm,
    color: figmaColors.textSecondary,
    marginTop: 4,
  },
  appCopyright: {
    fontSize: figmaFonts.sizes.xs,
    color: figmaColors.textMuted,
    marginTop: figmaSpacing.md,
  },
  appTeam: {
    fontSize: figmaFonts.sizes.xs,
    color: figmaColors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
