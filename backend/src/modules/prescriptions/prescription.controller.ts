/** Controller xử lý HTTP cho module đơn thuốc: OCR ảnh đơn thuốc, lưu và truy vấn đơn thuốc. */
import { NextFunction, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/api-response';
import { PrescriptionService } from './prescription.service';
import {
  savePrescriptionSchema,
  getPrescriptionsQuerySchema,
} from './prescription.schemas';

/**
 * Controller cho luồng đơn thuốc (yêu cầu xác thực): OCR, lưu và liệt kê đơn của user.
 */
export class PrescriptionController {
  /**
   * POST /prescriptions/ocr — nhận file ảnh upload qua multer, gửi sang AI vision để trích xuất
   * danh sách thuốc và trả kết quả về client.
   */
  static async ocrPrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        sendError(res, 'BAD_REQUEST', 'Image file is required', 400);
        return;
      }

      const result = await PrescriptionService.ocrPrescription(file.buffer);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /prescriptions — lưu đơn thuốc đã OCR (imageUrl + danh sách thuốc) vào DB.
   */
  static async savePrescription(req: Request, res: Response, next: NextFunction) {
    try {
      const { body } = savePrescriptionSchema.parse({ body: req.body });
      const data = await PrescriptionService.savePrescription(req.user!.userId, body);
      sendSuccess(res, data, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /prescriptions/me — lấy danh sách đơn thuốc của user hiện tại kèm các nhắc thuốc active.
   */
  static async getMyPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = getPrescriptionsQuerySchema.parse({ query: req.query });
      const { prescriptions, meta } = await PrescriptionService.getMyPrescriptions(
        req.user!.userId,
        query
      );
      sendSuccess(res, prescriptions, 200, meta);
    } catch (error) {
      next(error);
    }
  }
}
