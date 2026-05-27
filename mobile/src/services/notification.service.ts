/** Service phía mobile gọi các endpoint /notifications của backend (lấy và đánh dấu đã đọc). */
import { api, extractData } from './api';

export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELED'
  | 'MEDICINE_REMINDER'
  | 'HEALTH_ALERT'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Gọi GET /notifications/me lấy danh sách thông báo của user đang đăng nhập (có phân trang).
 * Trả về mảng Notification.
 */
export async function getMyNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<Notification[]> {
  const response = await api.get('/notifications/me', { params });
  return extractData<Notification[]>(response);
}

/**
 * Gọi PUT /notifications/:id/read đánh dấu một thông báo là đã đọc. Trả về Notification mới.
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return extractData<Notification>(response);
}

/**
 * Gọi PUT /notifications/read-all đánh dấu tất cả thông báo chưa đọc của user là đã đọc.
 * Trả về số bản ghi đã cập nhật.
 */
export async function markAllAsRead(): Promise<{ updated: number }> {
  const response = await api.put('/notifications/read-all');
  return extractData<{ updated: number }>(response);
}
