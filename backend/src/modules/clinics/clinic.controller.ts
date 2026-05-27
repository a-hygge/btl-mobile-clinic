/** Controller xử lý HTTP cho module phòng khám: danh sách và chi tiết phòng khám. */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendSuccess } from '@utils/api-response';
import { paginationSchema } from '@utils/pagination';
import { getClinicById, listClinics } from './clinic.service';

const querySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /clinics — lấy danh sách phòng khám có phân trang, hỗ trợ tìm theo tên/địa chỉ/SĐT.
 */
export async function getClinics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = querySchema.parse(req.query);
    const result = await listClinics(query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /clinics/:id — lấy chi tiết phòng khám kèm danh sách bác sĩ ACTIVE đang làm việc.
 */
export async function getClinicDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = paramsSchema.parse(req.params);
    const clinic = await getClinicById(id);
    sendSuccess(res, clinic);
  } catch (error) {
    next(error);
  }
}
