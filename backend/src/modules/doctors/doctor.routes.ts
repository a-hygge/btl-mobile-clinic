import { Router } from 'express';
import { getDoctorDetail, getDoctorSlots, getDoctors } from './doctor.controller';

export const doctorRouter = Router();

doctorRouter.get('/', getDoctors);
doctorRouter.get('/:id', getDoctorDetail);
doctorRouter.get('/:id/slots', getDoctorSlots);
