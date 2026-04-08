import { useAuthStore } from '../../src/store/auth.store';
import { BookingScreen } from '../../src/screens/booking/booking-screen';
import { DoctorScheduleScreen } from '../../src/screens/doctor-portal/doctor-schedule-screen';
import { ManageClinicsScreen } from '../../src/screens/admin/manage-clinics-screen';

/**
 * Tab "Đặt lịch / Lịch khám / Phòng khám" — different per role.
 */
export default function BookingRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'DOCTOR') return <DoctorScheduleScreen />;
  if (role === 'ADMIN') return <ManageClinicsScreen />;
  return <BookingScreen />;
}
