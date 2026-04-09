import { DoctorStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import {
  DoctorScheduleDto,
  RegisterDoctorScheduleInput,
  ScheduleUserContext,
} from './schedule.types';

const doctorScheduleInclude = {
  workSchedule: true,
} satisfies Prisma.DoctorScheduleInclude;

type DoctorScheduleRecord = Prisma.DoctorScheduleGetPayload<{
  include: typeof doctorScheduleInclude;
}>;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mapDoctorSchedule(record: DoctorScheduleRecord): DoctorScheduleDto {
  return {
    id: record.id,
    room: record.room,
    workSchedule: {
      id: record.workSchedule.id,
      date: toDateOnly(record.workSchedule.date),
      shift: record.workSchedule.shift,
      startTime: record.workSchedule.startTime,
      endTime: record.workSchedule.endTime,
      createdAt: record.workSchedule.createdAt.toISOString(),
    },
  };
}

async function getDoctorIdForUser(userId: string): Promise<string> {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor profile not found');
  }

  if (doctor.status !== DoctorStatus.ACTIVE) {
    throw AppError.forbidden('Doctor profile is not active');
  }

  return doctor.id;
}

export async function registerDoctorSchedules(
  context: ScheduleUserContext,
  input: RegisterDoctorScheduleInput
): Promise<DoctorScheduleDto[]> {
  if (context.role !== Role.DOCTOR) {
    throw AppError.forbidden('Only doctors can register schedules');
  }

  const doctorId = await getDoctorIdForUser(context.userId);

  let workScheduleIds: string[];

  if (input.workScheduleIds && input.workScheduleIds.length > 0) {
    // Legacy path: use pre-existing WorkSchedule IDs
    workScheduleIds = [...new Set(input.workScheduleIds)];
  } else if (input.date && input.shift) {
    // New path: auto-create WorkSchedule by date+shift
    const dateObj = new Date(input.date + 'T00:00:00.000Z');
    if (Number.isNaN(dateObj.getTime())) {
      throw AppError.badRequest('Invalid date');
    }

    // Find or create WorkSchedule for this date+shift
    let ws = await prisma.workSchedule.findFirst({
      where: {
        date: dateObj,
        shift: input.shift,
      },
    });

    if (!ws) {
      ws = await prisma.workSchedule.create({
        data: {
          date: dateObj,
          shift: input.shift,
          startTime: input.startTime ?? (input.shift === 'MORNING' ? '08:00' : '13:00'),
          endTime: input.endTime ?? (input.shift === 'MORNING' ? '12:00' : '17:00'),
        },
      });
    }

    workScheduleIds = [ws.id];
  } else {
    throw AppError.badRequest('Provide workScheduleIds or date+shift');
  }

  // Check not already registered
  const existing = await prisma.doctorSchedule.findMany({
    where: { doctorId, workScheduleId: { in: workScheduleIds } },
    select: { workScheduleId: true },
  });

  if (existing.length > 0) {
    throw AppError.conflict('Ca làm này đã được đăng ký');
  }

  await prisma.doctorSchedule.createMany({
    data: workScheduleIds.map((workScheduleId) => ({
      doctorId,
      workScheduleId,
      room: input.room,
    })),
  });

  const created = await prisma.doctorSchedule.findMany({
    where: { doctorId, workScheduleId: { in: workScheduleIds } },
    include: doctorScheduleInclude,
  });

  return created
    .map(mapDoctorSchedule)
    .sort((a, b) => a.workSchedule.date.localeCompare(b.workSchedule.date));
}

export async function getMyDoctorSchedules(
  context: ScheduleUserContext
): Promise<DoctorScheduleDto[]> {
  if (context.role !== Role.DOCTOR) {
    throw AppError.forbidden('Only doctors can view registered schedules');
  }

  const doctorId = await getDoctorIdForUser(context.userId);
  const schedules = await prisma.doctorSchedule.findMany({
    where: {
      doctorId,
    },
    include: doctorScheduleInclude,
  });

  return schedules
    .map(mapDoctorSchedule)
    .sort((left, right) => {
      return left.workSchedule.date.localeCompare(right.workSchedule.date);
    });
}
