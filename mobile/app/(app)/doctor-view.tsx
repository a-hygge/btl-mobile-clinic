import { useLocalSearchParams } from 'expo-router';
import { DoctorDetailScreen } from '../../src/screens/doctor/doctor-detail-screen';

export default function DoctorDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  if (!params.id) return null;
  return <DoctorDetailScreen doctorId={params.id} />;
}
