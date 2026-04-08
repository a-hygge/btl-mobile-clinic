import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useAuthStore } from '../../src/store/auth.store';
import { LoadingScreen } from '../../src/components/loading-screen';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

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
      <NativeTabs.Trigger name="doctors/[id]" hidden />
      <NativeTabs.Trigger name="chat-history" hidden />
      <NativeTabs.Trigger name="health" hidden />
      <NativeTabs.Trigger name="admin" hidden />
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
