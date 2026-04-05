import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination';

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).default([]),
  notes: z.string().trim().max(1000).optional(),
});

export const appointmentListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const appointmentActionSchema = z.object({
  diagnosis: z.string().trim().max(2000).optional(),
});

