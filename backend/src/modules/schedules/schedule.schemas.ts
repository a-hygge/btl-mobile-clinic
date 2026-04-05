import { z } from 'zod';

export const registerDoctorScheduleSchema = z.object({
  workScheduleIds: z.array(z.string().uuid()).min(1),
  room: z.string().trim().max(100).optional(),
});

