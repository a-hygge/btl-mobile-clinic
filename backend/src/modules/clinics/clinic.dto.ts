/** Định nghĩa DTO và hàm mapping entity Prisma sang dữ liệu trả cho client cho module clinic. */
import { Clinic, Doctor, Specialty, User } from '@prisma/client';

export interface ClinicDoctorDto {
  id: string;
  userId: string;
  name: string;
  specialty: {
    id: string;
    name: string;
  };
  experienceYears: number;
  consultationFee: number;
  status: Doctor['status'];
}

export interface ClinicListItemDto {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  openingHours: string | null;
  imageUrl: string | null;
}

export interface ClinicDetailDto extends ClinicListItemDto {
  doctors: ClinicDoctorDto[];
}

type DoctorWithRelations = Doctor & {
  user: Pick<User, 'name'>;
  specialty: Pick<Specialty, 'id' | 'name'>;
};

/**
 * Convert entity Clinic của Prisma sang DTO cho client (chuyển Decimal lat/lng thành number).
 */
export function mapClinicToListItemDto(clinic: Clinic): ClinicListItemDto {
  return {
    id: clinic.id,
    name: clinic.name,
    address: clinic.address,
    lat: clinic.lat === null ? null : Number(clinic.lat),
    lng: clinic.lng === null ? null : Number(clinic.lng),
    phone: clinic.phone,
    openingHours: clinic.openingHours,
    imageUrl: clinic.imageUrl,
  };
}

/**
 * Convert Doctor (đang làm việc trong phòng khám) kèm user và chuyên khoa sang DTO hiển thị
 * trong màn chi tiết phòng khám.
 */
export function mapClinicDoctorToDto(doctor: DoctorWithRelations): ClinicDoctorDto {
  return {
    id: doctor.id,
    userId: doctor.userId,
    name: doctor.user.name,
    specialty: {
      id: doctor.specialty.id,
      name: doctor.specialty.name,
    },
    experienceYears: doctor.experienceYears,
    consultationFee: Number(doctor.consultationFee),
    status: doctor.status,
  };
}
