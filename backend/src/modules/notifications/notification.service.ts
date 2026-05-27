/** Service xử lý nghiệp vụ thông báo: query, đánh dấu đã đọc và tạo notification cho các module khác. */
import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';
import type { GetNotificationsQuery } from './notification.schemas';

/**
 * Service xử lý toàn bộ nghiệp vụ thông báo (CRUD và helper tạo notification).
 */
export class NotificationService {
  /**
   * Lấy danh sách thông báo của user có phân trang, sắp xếp mới nhất lên đầu.
   */
  static async getMyNotifications(userId: string, query: GetNotificationsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Đánh dấu một thông báo là đã đọc. Kiểm tra notification thuộc về user trước khi update.
   */
  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Đánh dấu tất cả thông báo chưa đọc của user là đã đọc. Trả về số bản ghi đã cập nhật.
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  /**
   * Helper tạo thông báo mới — được gọi từ các service khác như đặt lịch, nhắc thuốc, cảnh báo sức khoẻ.
   */
  static async createNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>
  ) {
    return prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: (data ?? undefined) as unknown as import('@prisma/client').Prisma.InputJsonValue | undefined,
      },
    });
  }
}
