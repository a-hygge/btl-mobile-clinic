import { useAuthStore } from '../../../src/store/auth.store';
import { HomeScreen } from '../../../src/screens/home/home-screen';
import { DoctorHomeScreen } from '../../../src/screens/doctor-portal/doctor-home-screen';
import { AdminDashboardScreen } from '../../../src/screens/admin/admin-dashboard-screen';

export default function HomeRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'DOCTOR') return <DoctorHomeScreen />;
  if (role === 'ADMIN') return <AdminDashboardScreen />;
  return <HomeScreen />;
}
