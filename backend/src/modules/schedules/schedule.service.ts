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
  const uniqueIds = [...new Set(input.workScheduleIds)];

  const workSchedules = await prisma.workSchedule.findMany({
    where: {
      id: { in: uniqueIds },
    },
  });

  if (workSchedules.length !== uniqueIds.length) {
    throw AppError.notFound('One or more work schedules were not found');
  }

  const existingAssignments = await prisma.doctorSchedule.findMany({
    where: {
      doctorId,
      workScheduleId: { in: uniqueIds },
    },
    select: {
      workScheduleId: true,
    },
  });

  if (existingAssignments.length > 0) {
    throw AppError.conflict('One or more work schedules are already registered');
  }

  await prisma.doctorSchedule.createMany({
    data: uniqueIds.map((workScheduleId) => ({
      doctorId,
      workScheduleId,
      room: input.room,
    })),
  });

  const created = await prisma.doctorSchedule.findMany({
    where: {
      doctorId,
      workScheduleId: { in: uniqueIds },
    },
    include: doctorScheduleInclude,
  });

  return created
    .map(mapDoctorSchedule)
    .sort((left, right) => {
      return left.workSchedule.date.localeCompare(right.workSchedule.date);
    });
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
