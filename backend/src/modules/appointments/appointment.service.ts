import { AppointmentStatus, DoctorStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';
import { getPaginationMeta, getSkipTake } from '../../utils/pagination';
import {
  AppointmentDto,
  AppointmentListQuery,
  CreateAppointmentInput,
  AppointmentUserContext,
} from './appointment.types';

const appointmentInclude = {
  patient: {
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
    },
  },
  doctor: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      specialty: {
        select: {
          id: true,
          name: true,
        },
      },
      clinic: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  },
  timeSlot: true,
  services: {
    include: {
      service: true,
    },
  },
  review: true,
} satisfies Prisma.AppointmentInclude;

type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function toDateOnly(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function mapAppointment(record: AppointmentRecord): AppointmentDto {
  return {
    id: record.id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    timeSlotId: record.timeSlotId,
    status: record.status,
    notes: record.notes,
    diagnosis: record.diagnosis,
    totalAmount: decimalToNumber(record.totalAmount),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    canceledAt: toIso(record.canceledAt),
    patient: record.patient
      ? {
          id: record.patient.id,
          email: record.patient.email,
          name: record.patient.name,
          phone: record.patient.phone,
          avatarUrl: record.patient.avatarUrl,
        }
      : null,
    doctor: {
      id: record.doctor.id,
      userId: record.doctor.userId,
      name: record.doctor.user.name,
      specialty: {
        id: record.doctor.specialty.id,
        name: record.doctor.specialty.name,
      },
      clinic: record.doctor.clinic
        ? {
            id: record.doctor.clinic.id,
            name: record.doctor.clinic.name,
            address: record.doctor.clinic.address,
          }
        : null,
      experienceYears: record.doctor.experienceYears,
      consultationFee: decimalToNumber(record.doctor.consultationFee),
      status: record.doctor.status,
    },
    timeSlot: {
      id: record.timeSlot.id,
      doctorId: record.timeSlot.doctorId,
      date: toDateOnly(record.timeSlot.date) ?? '',
      startTime: record.timeSlot.startTime,
      endTime: record.timeSlot.endTime,
      isBooked: record.timeSlot.isBooked,
    },
    services: record.services.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      service: {
        id: item.service.id,
        name: item.service.name,
        price: decimalToNumber(item.service.price),
        category: item.service.category,
      },
      price: decimalToNumber(item.price),
    })),
    review: record.review
      ? {
          id: record.review.id,
          rating: record.review.rating,
          comment: record.review.comment,
          createdAt: record.review.createdAt.toISOString(),
        }
      : null,
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

async function assertAppointmentAccess(
  appointment: AppointmentRecord,
  context: AppointmentUserContext
): Promise<void> {
  if (context.role === Role.ADMIN) {
    return;
  }

  if (context.role === Role.PATIENT && appointment.patientId === context.userId) {
    return;
  }

  if (context.role === Role.DOCTOR) {
    const doctorId = await getDoctorIdForUser(context.userId);
    if (appointment.doctorId === doctorId) {
      return;
    }
  }

  throw AppError.forbidden('You do not have access to this appointment');
}

export async function createAppointment(
  userId: string,
  input: CreateAppointmentInput
): Promise<AppointmentDto> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: input.doctorId },
    include: {
      specialty: true,
      clinic: true,
      user: true,
    },
  });

  if (!doctor) {
    throw AppError.notFound('Doctor not found');
  }

  if (doctor.status !== DoctorStatus.ACTIVE) {
    throw AppError.conflict('Doctor is not available for booking');
  }

  const timeSlot = await prisma.timeSlot.findUnique({
    where: { id: input.timeSlotId },
  });

  if (!timeSlot || timeSlot.doctorId !== doctor.id) {
    throw AppError.notFound('Time slot not found');
  }

  if (timeSlot.isBooked) {
    throw AppError.conflict('Selected time slot is already booked');
  }

  const uniqueServiceIds = [...new Set(input.serviceIds)];
  const services =
    uniqueServiceIds.length > 0
      ? await prisma.service.findMany({
          where: {
            id: { in: uniqueServiceIds },
            deletedAt: null,
          },
        })
      : [];

  if (services.length !== uniqueServiceIds.length) {
    throw AppError.notFound('One or more services were not found');
  }

  const serviceTotal = services.reduce((sum, service) => sum + decimalToNumber(service.price), 0);
  const consultationFee = decimalToNumber(doctor.consultationFee);
  const totalAmount = consultationFee + serviceTotal;

  const appointment = await prisma.$transaction(async (tx) => {
    const lockedSlot = await tx.timeSlot.updateMany({
      where: {
        id: timeSlot.id,
        doctorId: doctor.id,
        isBooked: false,
      },
      data: {
        isBooked: true,
      },
    });

    if (lockedSlot.count === 0) {
      throw AppError.conflict('Selected time slot is already booked');
    }

    const created = await tx.appointment.create({
      data: {
        patientId: userId,
        doctorId: doctor.id,
        timeSlotId: timeSlot.id,
        notes: input.notes,
        totalAmount,
        services:
          services.length > 0
            ? {
                create: services.map((service) => ({
                  service: {
                    connect: {
                      id: service.id,
                    },
                  },
                  price: service.price,
                })),
              }
            : undefined,
      },
      include: appointmentInclude,
    });

    return created;
  });

  return mapAppointment(appointment);
}

export async function getAppointmentById(
  context: AppointmentUserContext,
  appointmentId: string
): Promise<AppointmentDto> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  await assertAppointmentAccess(appointment, context);
  return mapAppointment(appointment);
}

export async function getMyAppointments(
  context: AppointmentUserContext,
  query: AppointmentListQuery
): Promise<{ data: AppointmentDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  let where: Prisma.AppointmentWhereInput = {};

  if (context.role === Role.PATIENT) {
    where.patientId = context.userId;
  } else if (context.role === Role.DOCTOR) {
    where.doctorId = await getDoctorIdForUser(context.userId);
  }

  if (query.status) {
    where.status = query.status;
  }

  const [items, total] = await prisma.$transaction([
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: {
        createdAt: 'desc',
      },
      ...getSkipTake(query.page, query.limit),
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: items.map(mapAppointment),
    meta: getPaginationMeta(query.page, query.limit, total),
  };
}

export async function cancelAppointment(
  context: AppointmentUserContext,
  appointmentId: string
): Promise<AppointmentDto> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  if (context.role !== Role.ADMIN && appointment.patientId !== context.userId) {
    throw AppError.forbidden('You can only cancel your own appointment');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw AppError.conflict('Appointment is already canceled');
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw AppError.conflict('Completed appointments cannot be canceled');
  }

  const canceled = await prisma.$transaction(async (tx) => {
    await tx.timeSlot.updateMany({
      where: {
        id: appointment.timeSlotId,
        isBooked: true,
      },
      data: {
        isBooked: false,
      },
    });

    return tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledAt: new Date(),
      },
      include: appointmentInclude,
    });
  });

  return mapAppointment(canceled);
}

export async function confirmAppointment(
  context: AppointmentUserContext,
  appointmentId: string
): Promise<AppointmentDto> {
  if (context.role !== Role.DOCTOR) {
    throw AppError.forbidden('Only doctors can confirm appointments');
  }

  const doctorId = await getDoctorIdForUser(context.userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  if (appointment.doctorId !== doctorId) {
    throw AppError.forbidden('You can only confirm your own appointments');
  }

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw AppError.conflict('Only pending appointments can be confirmed');
  }

  const confirmed = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CONFIRMED,
    },
    include: appointmentInclude,
  });

  return mapAppointment(confirmed);
}

export async function completeAppointment(
  context: AppointmentUserContext,
  appointmentId: string,
  diagnosis?: string
): Promise<AppointmentDto> {
  if (context.role !== Role.DOCTOR) {
    throw AppError.forbidden('Only doctors can complete appointments');
  }

  const doctorId = await getDoctorIdForUser(context.userId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw AppError.notFound('Appointment not found');
  }

  if (appointment.doctorId !== doctorId) {
    throw AppError.forbidden('You can only complete your own appointments');
  }

  if (appointment.status !== AppointmentStatus.CONFIRMED) {
    throw AppError.conflict('Only confirmed appointments can be completed');
  }

  const completed = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.COMPLETED,
      diagnosis,
    },
    include: appointmentInclude,
  });

  return mapAppointment(completed);
}
