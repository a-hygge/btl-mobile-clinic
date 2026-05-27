/** Controller xử lý HTTP cho module thông báo: lấy danh sách, đánh dấu đã đọc. */
import { NextFunction, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/api-response';
import { NotificationService } from './notification.service';
import {
  getNotificationsQuerySchema,
  markAsReadParamsSchema,
} from './notification.schemas';

/**
 * Controller xử lý các endpoint thông báo của user hiện tại (yêu cầu xác thực).
 */
export class NotificationController {
  /**
   * GET /notifications/me — lấy danh sách thông báo của user hiện tại (có phân trang).
   */
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = getNotificationsQuerySchema.parse({ query: req.query });
      const { notifications, meta } = await NotificationService.getMyNotifications(
        req.user!.userId,
        query
      );
      sendSuccess(res, notifications, 200, meta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:id/read — đánh dấu một thông báo cụ thể là đã đọc.
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { params } = markAsReadParamsSchema.parse({ params: req.params });
      const data = await NotificationService.markAsRead(req.user!.userId, params.id);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-all — đánh dấu tất cả thông báo chưa đọc của user là đã đọc.
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await NotificationService.markAllAsRead(req.user!.userId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}
