import { useAuthStore } from '../../src/store/auth.store';
import { AppointmentsScreen } from '../../src/screens/booking/appointments-screen';
import { DoctorPatientsScreen } from '../../src/screens/doctor-portal/doctor-patients-screen';
import { ManageDoctorsScreen } from '../../src/screens/admin/manage-doctors-screen';

/**
 * Tab "Lịch hẹn / Bệnh nhân / Bác sĩ" — different per role.
 */
export default function AppointmentsRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'DOCTOR') return <DoctorPatientsScreen />;
  if (role === 'ADMIN') return <ManageDoctorsScreen />;
  return <AppointmentsScreen />;
}
