import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../utils/app-error';
import { sendSuccess } from '../../utils/api-response';
import { registerDoctorScheduleSchema } from './schedule.schemas';
import { getMyDoctorSchedules, registerDoctorSchedules } from './schedule.service';

export async function registerDoctorSchedulesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    const payload = registerDoctorScheduleSchema.parse(req.body);
    const schedules = await registerDoctorSchedules(user, payload);
    sendSuccess(res, schedules, 201);
  } catch (error) {
    next(error);
  }
}

export async function getMyDoctorSchedulesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw AppError.unauthorized();
    }

    const schedules = await getMyDoctorSchedules(user);
    sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
}
