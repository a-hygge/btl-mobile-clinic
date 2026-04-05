import { PrismaClient, Role, DoctorStatus, Shift } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "specialties" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "clinics" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "services" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "work_schedules" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "time_slots" CASCADE`;

  const passwordHash = await bcrypt.hash('password123', 10);

  // ====== ADMIN ======
  const admin = await prisma.user.create({
    data: {
      email: 'admin@healthcare.com',
      password: passwordHash,
      role: Role.ADMIN,
      name: 'System Admin',
      phone: '0900000000',
    },
  });

  // ====== SPECIALTIES ======
  const specialties = await Promise.all([
    prisma.specialty.create({
      data: { name: 'Tim mach', description: 'Cardiology', symptoms: ['dau nguc', 'kho tho', 'nhip tim nhanh'] },
    }),
    prisma.specialty.create({
      data: { name: 'Than kinh', description: 'Neurology', symptoms: ['dau dau', 'chong mat', 'mat ngu'] },
    }),
    prisma.specialty.create({
      data: { name: 'Tieu hoa', description: 'Gastroenterology', symptoms: ['dau bung', 'buon non', 'tieu chay'] },
    }),
    prisma.specialty.create({
      data: { name: 'Da lieu', description: 'Dermatology', symptoms: ['ngua', 'phat ban', 'mun'] },
    }),
    prisma.specialty.create({
      data: { name: 'Nhi khoa', description: 'Pediatrics', symptoms: ['sot', 'ho', 'so mui'] },
    }),
    prisma.specialty.create({
      data: { name: 'Mat', description: 'Ophthalmology', symptoms: ['mo mat', 'dau mat', 'nhin khong ro'] },
    }),
  ]);

  // ====== CLINICS ======
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'Phong kham Da khoa Sai Gon',
        address: '123 Nguyen Trai, Thanh Xuan, Ha Noi',
        lat: 21.0028,
        lng: 105.8200,
        phone: '024-1234-5678',
        openingHours: '08:00 - 17:00',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Phong kham Quoc te Ha Noi',
        address: '456 Le Van Luong, Cau Giay, Ha Noi',
        lat: 21.0122,
        lng: 105.7918,
        phone: '024-8765-4321',
        openingHours: '07:30 - 18:00',
      },
    }),
  ]);

  // ====== SERVICES ======
  const services = await Promise.all([
    prisma.service.create({ data: { name: 'Kham tong quat', price: 200000, category: 'Kham' } }),
    prisma.service.create({ data: { name: 'Xet nghiem mau', price: 150000, category: 'Xet nghiem' } }),
    prisma.service.create({ data: { name: 'Chup X-quang', price: 300000, category: 'Chan doan hinh anh' } }),
    prisma.service.create({ data: { name: 'Sieu am', price: 250000, category: 'Chan doan hinh anh' } }),
    prisma.service.create({ data: { name: 'Dien tam do', price: 180000, category: 'Xet nghiem' } }),
  ]);

  // ====== DOCTORS ======
  const doctorUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'doctor1@healthcare.com',
        password: passwordHash,
        role: Role.DOCTOR,
        name: 'BS. Nguyen Van A',
        phone: '0901111111',
      },
    }),
    prisma.user.create({
      data: {
        email: 'doctor2@healthcare.com',
        password: passwordHash,
        role: Role.DOCTOR,
        name: 'BS. Tran Thi B',
        phone: '0902222222',
      },
    }),
    prisma.user.create({
      data: {
        email: 'doctor3@healthcare.com',
        password: passwordHash,
        role: Role.DOCTOR,
        name: 'BS. Le Van C',
        phone: '0903333333',
      },
    }),
  ]);

  const doctors = await Promise.all([
    prisma.doctor.create({
      data: {
        userId: doctorUsers[0].id,
        specialtyId: specialties[0].id,
        clinicId: clinics[0].id,
        experienceYears: 10,
        bio: 'Bac si chuyen khoa Tim mach voi 10 nam kinh nghiem.',
        consultationFee: 300000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-001',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[1].id,
        specialtyId: specialties[1].id,
        clinicId: clinics[0].id,
        experienceYears: 8,
        bio: 'Chuyen gia Than kinh, tot nghiep Dai hoc Y Ha Noi.',
        consultationFee: 350000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-002',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[2].id,
        specialtyId: specialties[2].id,
        clinicId: clinics[1].id,
        experienceYears: 5,
        bio: 'Bac si Tieu hoa, chuyen dieu tri cac benh ly duong ruot.',
        consultationFee: 250000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-003',
      },
    }),
  ]);

  // ====== PATIENTS ======
  await Promise.all([
    prisma.user.create({
      data: {
        email: 'patient1@gmail.com',
        password: passwordHash,
        role: Role.PATIENT,
        name: 'Nguyen Van Patient',
        phone: '0911111111',
        address: 'Ha Noi',
      },
    }),
    prisma.user.create({
      data: {
        email: 'patient2@gmail.com',
        password: passwordHash,
        role: Role.PATIENT,
        name: 'Tran Thi Patient',
        phone: '0922222222',
        address: 'Ha Noi',
      },
    }),
  ]);

  // ====== WORK SCHEDULES (current month) ======
  // Use UTC dates to avoid timezone shift with @db.Date columns
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCDay() === 0) continue; // skip Sunday

    await prisma.workSchedule.createMany({
      data: [
        { date, shift: Shift.MORNING, startTime: '08:00', endTime: '12:00' },
        { date, shift: Shift.AFTERNOON, startTime: '13:00', endTime: '17:00' },
      ],
      skipDuplicates: true,
    });
  }

  // ====== DOCTOR SERVICES ======
  await prisma.doctorService.createMany({
    data: [
      { doctorId: doctors[0].id, serviceId: services[0].id, price: 200000 },
      { doctorId: doctors[0].id, serviceId: services[4].id, price: 180000 },
      { doctorId: doctors[1].id, serviceId: services[0].id, price: 200000 },
      { doctorId: doctors[1].id, serviceId: services[3].id, price: 250000 },
      { doctorId: doctors[2].id, serviceId: services[0].id, price: 200000 },
      { doctorId: doctors[2].id, serviceId: services[1].id, price: 150000 },
      { doctorId: doctors[2].id, serviceId: services[2].id, price: 300000 },
    ],
    skipDuplicates: true,
  });

  // ====== TIME SLOTS (next 7 days) ======
  const timeSlotTemplates = [
    { startTime: '08:00', endTime: '08:30' },
    { startTime: '08:30', endTime: '09:00' },
    { startTime: '09:00', endTime: '09:30' },
    { startTime: '09:30', endTime: '10:00' },
    { startTime: '13:00', endTime: '13:30' },
    { startTime: '13:30', endTime: '14:00' },
    { startTime: '14:00', endTime: '14:30' },
    { startTime: '14:30', endTime: '15:00' },
  ];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(Date.UTC(year, month, today.getUTCDate() + offset));

    if (date.getUTCDay() === 0) continue;

    for (const doctor of doctors) {
      await prisma.timeSlot.createMany({
        data: timeSlotTemplates.map((slot) => ({
          doctorId: doctor.id,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log('Seed completed!');
  console.log('Admin: admin@healthcare.com / password123');
  console.log('Doctor: doctor1@healthcare.com / password123');
  console.log('Patient: patient1@gmail.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
