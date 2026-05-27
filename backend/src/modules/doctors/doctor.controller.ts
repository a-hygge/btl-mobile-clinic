/** Controller xử lý request HTTP cho module bác sĩ: danh sách, chi tiết, slot khám và đánh giá. */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@utils/api-response';
import { paginationSchema } from '@utils/pagination';
import { getDoctorById, getDoctorReviews, listDoctorSlots, listDoctors } from './doctor.service';

const listQuerySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  specialtyId: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED']).optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const slotsQuerySchema = z.object({
  date: z.string().trim().optional(),
});

const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /doctors — lấy danh sách bác sĩ có phân trang, hỗ trợ tìm kiếm theo từ khoá,
 * chuyên khoa, phòng khám và trạng thái duyệt hồ sơ.
 */
export async function getDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listDoctors(query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /doctors/:id — lấy chi tiết một bác sĩ (kèm dịch vụ, rating) phục vụ màn doctor-detail.
 */
export async function getDoctorDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = paramsSchema.parse(req.params);
    const doctor = await getDoctorById(id);
    sendSuccess(res, doctor);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /doctors/:id/slots — lấy danh sách khung giờ còn trống của bác sĩ, có thể lọc theo ngày.
 */
export async function getDoctorSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = paramsSchema.parse(req.params);
    const query = slotsQuerySchema.parse(req.query);
    const slots = await listDoctorSlots({ id, date: query.date });
    sendSuccess(res, slots);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /doctors/:id/reviews — lấy danh sách review của bác sĩ kèm thống kê rating (phân trang).
 */
export async function getDoctorReviewsList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = paramsSchema.parse(req.params);
    const query = reviewsQuerySchema.parse(req.query);
    const result = await getDoctorReviews(id, query);
    sendSuccess(
      res,
      { items: result.items, stats: result.stats },
      200,
      result.meta
    );
  } catch (error) {
    next(error);
  }
}
