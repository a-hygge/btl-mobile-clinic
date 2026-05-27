/** Khai báo route HTTP cho module phòng khám (danh sách và chi tiết). */
import { Router } from 'express';
import { getClinicDetail, getClinics } from './clinic.controller';

export const clinicRouter = Router();

clinicRouter.get('/', getClinics);
clinicRouter.get('/:id', getClinicDetail);
