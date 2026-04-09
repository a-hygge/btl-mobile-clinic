import { z } from 'zod';

export const registerDoctorScheduleSchema = z.object({
  workScheduleIds: z.array(z.string().uuid()).min(1).optional(),
  // Alternative: register by date+shift (auto-creates WorkSchedule)
  date: z.string().optional(),
  shift: z.enum(['MORNING', 'AFTERNOON']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().trim().max(100).optional(),
});
