import { useAuthStore } from '../../src/store/auth.store';
import { ChatScreen } from '../../src/screens/chat/chat-screen';
import { DoctorReviewsScreen } from '../../src/screens/doctor-portal/doctor-reviews-screen';
import { ManageServicesScreen } from '../../src/screens/admin/manage-services-screen';

/**
 * Tab "Chat AI / Đánh giá / Dịch vụ" — different per role.
 */
export default function ChatRoute() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'DOCTOR') return <DoctorReviewsScreen />;
  if (role === 'ADMIN') return <ManageServicesScreen />;
  return <ChatScreen />;
}
