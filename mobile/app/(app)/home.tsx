import { useAuthStore } from '../../src/store/auth.store';
import { HomeScreen } from '../../src/screens/home/home-screen';
import { DoctorHomeScreen } from '../../src/screens/doctor-portal/doctor-home-screen';

export default function HomeRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'DOCTOR') return <DoctorHomeScreen />;
  return <HomeScreen />;
}
