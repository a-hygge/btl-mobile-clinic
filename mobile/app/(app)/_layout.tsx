import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useAuthStore } from '../../src/store/auth.store';
import { LoadingScreen } from '../../src/components/loading-screen';

/**
 * Role-based bottom tab navigation.
 * Each role gets its own NativeTabs with different visible triggers.
 * All other route files exist in the (app) group as hidden triggers
 * so they remain navigable from any tab.
 *
 * NOTE: NativeTabs only accepts direct <NativeTabs.Trigger> children
 * (no Fragment wrappers, no helper functions returning JSX), so the
 * full set of triggers is inlined per role.
 */
export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const role = user?.role ?? 'PATIENT';

  if (role === 'DOCTOR') {
    return <DoctorTabs />;
  }
  if (role === 'ADMIN') {
    return <AdminTabs />;
  }
  return <PatientTabs />;
}

// ---------------------------------------------------------------------------
// PATIENT TABS
// ---------------------------------------------------------------------------

function PatientTabs() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Trang chủ</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="booking">
        <Icon sf={{ default: 'calendar.badge.plus', selected: 'calendar.badge.plus' }} />
        <Label>Đặt lịch</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="appointments">
        <Icon sf={{ default: 'list.clipboard', selected: 'list.clipboard.fill' }} />
        <Label>Lịch hẹn</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <Label>Chat AI</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Cá nhân</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="doctor-search" hidden />
      <NativeTabs.Trigger name="doctor-home" hidden />
      <NativeTabs.Trigger name="doctor-schedule" hidden />
      <NativeTabs.Trigger name="doctor-patients" hidden />
      <NativeTabs.Trigger name="doctor-reviews" hidden />
      <NativeTabs.Trigger name="doctor-profile" hidden />
      <NativeTabs.Trigger name="doctor-time-slots" hidden />
      <NativeTabs.Trigger name="doctors/[id]" hidden />
      <NativeTabs.Trigger name="chat-history" hidden />
      <NativeTabs.Trigger name="health" hidden />
      <NativeTabs.Trigger name="admin" hidden />
      <NativeTabs.Trigger name="admin-doctors" hidden />
      <NativeTabs.Trigger name="admin-services" hidden />
      <NativeTabs.Trigger name="admin-clinics" hidden />
      <NativeTabs.Trigger name="admin-settings" hidden />
      <NativeTabs.Trigger name="approve-doctor" hidden />
      <NativeTabs.Trigger name="payment" hidden />
      <NativeTabs.Trigger name="payment-history" hidden />
      <NativeTabs.Trigger name="ocr" hidden />
      <NativeTabs.Trigger name="notifications" hidden />
      <NativeTabs.Trigger name="appointment-detail" hidden />
      <NativeTabs.Trigger name="review" hidden />
      <NativeTabs.Trigger name="edit-profile" hidden />
      <NativeTabs.Trigger name="reschedule" hidden />
      <NativeTabs.Trigger name="medical-history" hidden />
    </NativeTabs>
  );
}

// ---------------------------------------------------------------------------
// DOCTOR TABS
// ---------------------------------------------------------------------------

function DoctorTabs() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: 'stethoscope', selected: 'stethoscope' }} />
        <Label>Trang chủ</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="booking">
        <Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <Label>Lịch khám</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="appointments">
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <Label>Bệnh nhân</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'star', selected: 'star.fill' }} />
        <Label>Đánh giá</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Cá nhân</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="doctor-search" hidden />
      <NativeTabs.Trigger name="doctor-home" hidden />
      <NativeTabs.Trigger name="doctor-schedule" hidden />
      <NativeTabs.Trigger name="doctor-patients" hidden />
      <NativeTabs.Trigger name="doctor-reviews" hidden />
      <NativeTabs.Trigger name="doctor-profile" hidden />
      <NativeTabs.Trigger name="doctor-time-slots" hidden />
      <NativeTabs.Trigger name="doctors/[id]" hidden />
      <NativeTabs.Trigger name="chat-history" hidden />
      <NativeTabs.Trigger name="health" hidden />
      <NativeTabs.Trigger name="admin" hidden />
      <NativeTabs.Trigger name="admin-doctors" hidden />
      <NativeTabs.Trigger name="admin-services" hidden />
      <NativeTabs.Trigger name="admin-clinics" hidden />
      <NativeTabs.Trigger name="admin-settings" hidden />
      <NativeTabs.Trigger name="approve-doctor" hidden />
      <NativeTabs.Trigger name="payment" hidden />
      <NativeTabs.Trigger name="payment-history" hidden />
      <NativeTabs.Trigger name="ocr" hidden />
      <NativeTabs.Trigger name="notifications" hidden />
      <NativeTabs.Trigger name="appointment-detail" hidden />
      <NativeTabs.Trigger name="review" hidden />
      <NativeTabs.Trigger name="edit-profile" hidden />
      <NativeTabs.Trigger name="reschedule" hidden />
      <NativeTabs.Trigger name="medical-history" hidden />
    </NativeTabs>
  );
}

// ---------------------------------------------------------------------------
// ADMIN TABS
// ---------------------------------------------------------------------------

function AdminTabs() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="booking">
        <Icon sf={{ default: 'building.2', selected: 'building.2.fill' }} />
        <Label>Phòng khám</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="appointments">
        <Icon sf={{ default: 'person.2.badge.gearshape', selected: 'person.2.badge.gearshape.fill' }} />
        <Label>Bác sĩ</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'briefcase', selected: 'briefcase.fill' }} />
        <Label>Dịch vụ</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>Cài đặt</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="doctor-search" hidden />
      <NativeTabs.Trigger name="doctor-home" hidden />
      <NativeTabs.Trigger name="doctor-schedule" hidden />
      <NativeTabs.Trigger name="doctor-patients" hidden />
      <NativeTabs.Trigger name="doctor-reviews" hidden />
      <NativeTabs.Trigger name="doctor-profile" hidden />
      <NativeTabs.Trigger name="doctor-time-slots" hidden />
      <NativeTabs.Trigger name="doctors/[id]" hidden />
      <NativeTabs.Trigger name="chat-history" hidden />
      <NativeTabs.Trigger name="health" hidden />
      <NativeTabs.Trigger name="admin" hidden />
      <NativeTabs.Trigger name="admin-doctors" hidden />
      <NativeTabs.Trigger name="admin-services" hidden />
      <NativeTabs.Trigger name="admin-clinics" hidden />
      <NativeTabs.Trigger name="admin-settings" hidden />
      <NativeTabs.Trigger name="approve-doctor" hidden />
      <NativeTabs.Trigger name="payment" hidden />
      <NativeTabs.Trigger name="payment-history" hidden />
      <NativeTabs.Trigger name="ocr" hidden />
      <NativeTabs.Trigger name="notifications" hidden />
      <NativeTabs.Trigger name="appointment-detail" hidden />
      <NativeTabs.Trigger name="review" hidden />
      <NativeTabs.Trigger name="edit-profile" hidden />
      <NativeTabs.Trigger name="reschedule" hidden />
      <NativeTabs.Trigger name="medical-history" hidden />
    </NativeTabs>
  );
}
