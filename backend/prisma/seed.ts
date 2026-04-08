import {
  PrismaClient,
  Role,
  DoctorStatus,
  Shift,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  HealthMetricType,
  AlertSeverity,
  ChatMessageRole,
  NotificationType,
} from '@prisma/client';
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
  await prisma.user.create({
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

  const specTimMach = specialties[0];
  const specThanKinh = specialties[1];
  const specTieuHoa = specialties[2];
  const specDaLieu = specialties[3];
  const specNhiKhoa = specialties[4];
  const specMat = specialties[5];

  // ====== CLINICS ======
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'Phong kham Da khoa Sai Gon',
        address: '123 Nguyen Trai, Thanh Xuan, Ha Noi',
        lat: 21.0028,
        lng: 105.82,
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
    prisma.clinic.create({
      data: {
        name: 'Phong kham Hong Ngoc',
        address: '55 Yen Ninh, Hai Ba Trung, Ha Noi',
        lat: 21.0285,
        lng: 105.8542,
        phone: '024-3927-5568',
        openingHours: '07:00 - 19:00',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Benh vien Bach Mai',
        address: '78 Giai Phong, Dong Da, Ha Noi',
        lat: 20.9999,
        lng: 105.8412,
        phone: '024-3869-3731',
        openingHours: '06:30 - 20:00',
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Phong kham Vinmec',
        address: '458 Minh Khai, Long Bien, Ha Noi',
        lat: 21.0451,
        lng: 105.8997,
        phone: '024-3974-3556',
        openingHours: '07:00 - 21:00',
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
    prisma.service.create({ data: { name: 'Kham chuyen khoa', price: 250000, category: 'Kham' } }),
    prisma.service.create({ data: { name: 'Tu van dinh duong', price: 150000, category: 'Tu van' } }),
    prisma.service.create({ data: { name: 'Noi soi da day', price: 500000, category: 'Chan doan' } }),
    prisma.service.create({ data: { name: 'Chup cong huong tu', price: 1500000, category: 'Chan doan hinh anh' } }),
    prisma.service.create({ data: { name: 'Test di ung', price: 300000, category: 'Xet nghiem' } }),
    prisma.service.create({ data: { name: 'Kham nha khoa', price: 200000, category: 'Nha khoa' } }),
    prisma.service.create({ data: { name: 'Lam sach rang', price: 350000, category: 'Nha khoa' } }),
  ]);

  // ====== DOCTOR USERS ======
  const doctorUsers = await Promise.all([
    prisma.user.create({
      data: { email: 'doctor1@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Nguyen Van A', phone: '0901111111' },
    }),
    prisma.user.create({
      data: { email: 'doctor2@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Tran Thi B', phone: '0902222222' },
    }),
    prisma.user.create({
      data: { email: 'doctor3@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Le Van C', phone: '0903333333' },
    }),
    prisma.user.create({
      data: { email: 'doctor4@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Pham Thi D', phone: '0904444444' },
    }),
    prisma.user.create({
      data: { email: 'doctor5@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Hoang Van E', phone: '0905555555' },
    }),
    prisma.user.create({
      data: { email: 'doctor6@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Vu Thi F', phone: '0906666666' },
    }),
    prisma.user.create({
      data: { email: 'doctor7@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Dang Van G', phone: '0907777777' },
    }),
    prisma.user.create({
      data: { email: 'doctor8@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Bui Thi H', phone: '0908888888' },
    }),
    // Pending doctors
    prisma.user.create({
      data: { email: 'doctor9@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Ly Van I', phone: '0909999991' },
    }),
    prisma.user.create({
      data: { email: 'doctor10@healthcare.com', password: passwordHash, role: Role.DOCTOR, name: 'BS. Truong Thi K', phone: '0909999992' },
    }),
  ]);

  const doctors = await Promise.all([
    prisma.doctor.create({
      data: {
        userId: doctorUsers[0].id,
        specialtyId: specTimMach.id,
        clinicId: clinics[0].id,
        experienceYears: 12,
        bio: 'Bac si chuyen khoa Tim mach voi hon 12 nam kinh nghiem dieu tri benh ly tim mach.',
        consultationFee: 350000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-001',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[1].id,
        specialtyId: specThanKinh.id,
        clinicId: clinics[0].id,
        experienceYears: 8,
        bio: 'Chuyen gia Than kinh, tot nghiep Dai hoc Y Ha Noi voi nhieu thanh tuu nghien cuu.',
        consultationFee: 350000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-002',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[2].id,
        specialtyId: specTieuHoa.id,
        clinicId: clinics[1].id,
        experienceYears: 6,
        bio: 'Bac si Tieu hoa, chuyen dieu tri cac benh ly duong ruot va da day.',
        consultationFee: 250000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-003',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[3].id,
        specialtyId: specDaLieu.id,
        clinicId: clinics[2].id,
        experienceYears: 9,
        bio: 'Bac si Da lieu giau kinh nghiem, chuyen dieu tri mun, vay nen va cac benh ngoai da.',
        consultationFee: 300000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-004',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[4].id,
        specialtyId: specNhiKhoa.id,
        clinicId: clinics[3].id,
        experienceYears: 11,
        bio: 'Bac si Nhi khoa tan tam, hon 10 nam kham va dieu tri cho tre em moi lua tuoi.',
        consultationFee: 280000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-005',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[5].id,
        specialtyId: specMat.id,
        clinicId: clinics[4].id,
        experienceYears: 7,
        bio: 'Bac si Mat chuyen khoa II, kinh nghiem trong phau thuat khuc xa va dieu tri can thi.',
        consultationFee: 320000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-006',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[6].id,
        specialtyId: specTimMach.id,
        clinicId: clinics[3].id,
        experienceYears: 15,
        bio: 'Truong khoa Tim mach Benh vien Bach Mai, 15 nam kinh nghiem can thiep tim mach.',
        consultationFee: 500000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-007',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[7].id,
        specialtyId: specTieuHoa.id,
        clinicId: clinics[4].id,
        experienceYears: 10,
        bio: 'Bac si Tieu hoa noi soi, chuyen dieu tri viem loet da day va trao nguoc.',
        consultationFee: 380000,
        status: DoctorStatus.ACTIVE,
        licenseNumber: 'BS-008',
      },
    }),
    // Pending
    prisma.doctor.create({
      data: {
        userId: doctorUsers[8].id,
        specialtyId: specDaLieu.id,
        clinicId: clinics[2].id,
        experienceYears: 4,
        bio: 'Bac si tre, vua hoan thanh chuyen khoa I tai Dai hoc Y Duoc TP HCM.',
        consultationFee: 220000,
        status: DoctorStatus.PENDING,
        licenseNumber: 'BS-009',
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUsers[9].id,
        specialtyId: specNhiKhoa.id,
        clinicId: clinics[1].id,
        experienceYears: 5,
        bio: 'Chuyen Nhi khoa, mong muon dem lai dich vu kham chua benh tot nhat cho tre em.',
        consultationFee: 240000,
        status: DoctorStatus.PENDING,
        licenseNumber: 'BS-010',
      },
    }),
  ]);

  // Active doctors only (for slots/appointments)
  const activeDoctors = doctors.slice(0, 8);

  // ====== PATIENTS ======
  const patients = await Promise.all([
    prisma.user.create({
      data: { email: 'patient1@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Nguyen Van Patient', phone: '0911111111', address: 'Ha Noi' },
    }),
    prisma.user.create({
      data: { email: 'patient2@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Tran Thi Patient', phone: '0922222222', address: 'Ha Noi' },
    }),
    prisma.user.create({
      data: { email: 'patient3@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Le Thi M', phone: '0933333333', address: 'Ha Noi' },
    }),
    prisma.user.create({
      data: { email: 'patient4@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Pham Van N', phone: '0944444444', address: 'Ha Noi' },
    }),
    prisma.user.create({
      data: { email: 'patient5@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Hoang Thi O', phone: '0955555555', address: 'Ha Noi' },
    }),
    prisma.user.create({
      data: { email: 'patient6@gmail.com', password: passwordHash, role: Role.PATIENT, name: 'Vu Van P', phone: '0966666666', address: 'Ha Noi' },
    }),
  ]);

  const [patient1, patient2, patient3, patient4, patient5, patient6] = patients;

  // ====== WORK SCHEDULES (current month) ======
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const todayDay = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCDay() === 0) continue;

    await prisma.workSchedule.createMany({
      data: [
        { date, shift: Shift.MORNING, startTime: '08:00', endTime: '12:00' },
        { date, shift: Shift.AFTERNOON, startTime: '13:00', endTime: '17:00' },
      ],
      skipDuplicates: true,
    });
  }

  // ====== DOCTOR SERVICES ======
  // Each doctor links to 2-4 services
  const doctorServiceMap: { doctorIdx: number; serviceIdxs: number[] }[] = [
    { doctorIdx: 0, serviceIdxs: [0, 4, 5] }, // Tim mach: kham, dien tam do, chuyen khoa
    { doctorIdx: 1, serviceIdxs: [0, 5, 8] }, // Than kinh: kham, chuyen khoa, MRI
    { doctorIdx: 2, serviceIdxs: [0, 1, 7] }, // Tieu hoa: kham, mau, noi soi
    { doctorIdx: 3, serviceIdxs: [0, 5, 9] }, // Da lieu: kham, chuyen khoa, di ung
    { doctorIdx: 4, serviceIdxs: [0, 5, 6] }, // Nhi: kham, chuyen khoa, dinh duong
    { doctorIdx: 5, serviceIdxs: [0, 5] }, // Mat: kham, chuyen khoa
    { doctorIdx: 6, serviceIdxs: [0, 4, 5, 8] }, // Tim mach 2
    { doctorIdx: 7, serviceIdxs: [0, 1, 7, 5] }, // Tieu hoa 2
  ];

  await prisma.doctorService.createMany({
    data: doctorServiceMap.flatMap(({ doctorIdx, serviceIdxs }) =>
      serviceIdxs.map((sIdx) => ({
        doctorId: activeDoctors[doctorIdx].id,
        serviceId: services[sIdx].id,
        price: Number(services[sIdx].price),
      }))
    ),
    skipDuplicates: true,
  });

  // ====== TIME SLOTS (next 14 days for current + booked past slots) ======
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

  // Future slots: next 14 days
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(Date.UTC(year, month, todayDay + offset));
    if (date.getUTCDay() === 0) continue;

    for (const doctor of activeDoctors) {
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

  // Past slots: last 30 days (for completed appointments)
  for (let offset = 1; offset <= 30; offset += 1) {
    const date = new Date(Date.UTC(year, month, todayDay - offset));
    if (date.getUTCDay() === 0) continue;

    for (const doctor of activeDoctors) {
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

  // Helper: get slot for doctor on specific day offset and pick first available
  const usedSlotIds = new Set<string>();
  async function pickSlot(doctorId: string, dayOffset: number): Promise<string> {
    // If the requested day lands on Sunday (no slots), shift by 1 day in the same direction.
    let actualOffset = dayOffset;
    for (let attempts = 0; attempts < 7; attempts++) {
      const date = new Date(Date.UTC(year, month, todayDay + actualOffset));
      if (date.getUTCDay() !== 0) {
        const slots = await prisma.timeSlot.findMany({
          where: { doctorId, date, isBooked: false },
          orderBy: { startTime: 'asc' },
        });
        for (const s of slots) {
          if (!usedSlotIds.has(s.id)) {
            usedSlotIds.add(s.id);
            await prisma.timeSlot.update({ where: { id: s.id }, data: { isBooked: true } });
            return s.id;
          }
        }
      }
      actualOffset += dayOffset >= 0 ? 1 : -1;
    }
    throw new Error(`No slot available for doctor ${doctorId} near day offset ${dayOffset}`);
  }

  // ====== APPOINTMENTS ======
  type ApptDef = {
    patientId: string;
    doctorIdx: number;
    dayOffset: number;
    status: AppointmentStatus;
    notes?: string;
    diagnosis?: string;
    serviceIdxs: number[];
  };

  const apptDefs: ApptDef[] = [
    // patient1 - 8 appointments
    { patientId: patient1.id, doctorIdx: 0, dayOffset: 2, status: AppointmentStatus.PENDING, notes: 'Toi bi dau nguc va kho tho khi gang suc', serviceIdxs: [0, 4] },
    { patientId: patient1.id, doctorIdx: 1, dayOffset: 5, status: AppointmentStatus.PENDING, notes: 'Dau dau keo dai 1 tuan, mat ngu', serviceIdxs: [0] },
    { patientId: patient1.id, doctorIdx: 2, dayOffset: 1, status: AppointmentStatus.CONFIRMED, notes: 'Dau bung am i vung tren ron', serviceIdxs: [0, 1] },
    { patientId: patient1.id, doctorIdx: 3, dayOffset: 3, status: AppointmentStatus.CONFIRMED, notes: 'Phat ban ngua o tay', serviceIdxs: [0, 9] },
    { patientId: patient1.id, doctorIdx: 0, dayOffset: -7, status: AppointmentStatus.COMPLETED, diagnosis: 'Tang huyet ap do 1, can theo doi va dieu chinh che do an', serviceIdxs: [0, 4] },
    { patientId: patient1.id, doctorIdx: 2, dayOffset: -14, status: AppointmentStatus.COMPLETED, diagnosis: 'Viem da day nhe, can dung thuoc giam tiet acid', serviceIdxs: [0, 1] },
    { patientId: patient1.id, doctorIdx: 1, dayOffset: -21, status: AppointmentStatus.COMPLETED, diagnosis: 'Roi loan giac ngu, stress nghe nghiep', serviceIdxs: [0] },
    { patientId: patient1.id, doctorIdx: 5, dayOffset: -10, status: AppointmentStatus.CANCELED, notes: 'Khong the den theo lich', serviceIdxs: [0] },

    // patient2 - 4 appointments
    { patientId: patient2.id, doctorIdx: 4, dayOffset: 4, status: AppointmentStatus.PENDING, notes: 'Con bi sot va ho', serviceIdxs: [0] },
    { patientId: patient2.id, doctorIdx: 3, dayOffset: 2, status: AppointmentStatus.CONFIRMED, notes: 'Mun trung ca nang', serviceIdxs: [0, 5] },
    { patientId: patient2.id, doctorIdx: 0, dayOffset: -5, status: AppointmentStatus.COMPLETED, diagnosis: 'Tim mach binh thuong, can luyen tap dieu do', serviceIdxs: [0, 4] },
    { patientId: patient2.id, doctorIdx: 6, dayOffset: -12, status: AppointmentStatus.CANCELED, notes: 'Co viec dot xuat', serviceIdxs: [0] },

    // Other patients - mostly completed for review data
    { patientId: patient3.id, doctorIdx: 0, dayOffset: -3, status: AppointmentStatus.COMPLETED, diagnosis: 'Roi loan nhip tim nhe', serviceIdxs: [0, 4] },
    { patientId: patient3.id, doctorIdx: 1, dayOffset: -8, status: AppointmentStatus.COMPLETED, diagnosis: 'Chong mat tu the lanh tinh', serviceIdxs: [0] },
    { patientId: patient4.id, doctorIdx: 0, dayOffset: -4, status: AppointmentStatus.COMPLETED, diagnosis: 'Tang huyet ap do 1', serviceIdxs: [0, 4] },
    { patientId: patient4.id, doctorIdx: 2, dayOffset: -9, status: AppointmentStatus.COMPLETED, diagnosis: 'Hoi chung ruot kich thich', serviceIdxs: [0, 1] },
    { patientId: patient5.id, doctorIdx: 0, dayOffset: -6, status: AppointmentStatus.COMPLETED, diagnosis: 'Suy tim do 1', serviceIdxs: [0, 4] },
    { patientId: patient5.id, doctorIdx: 3, dayOffset: -11, status: AppointmentStatus.COMPLETED, diagnosis: 'Viem da co dia', serviceIdxs: [0] },
    { patientId: patient6.id, doctorIdx: 0, dayOffset: -2, status: AppointmentStatus.COMPLETED, diagnosis: 'Kham suc khoe dinh ky binh thuong', serviceIdxs: [0] },
    { patientId: patient6.id, doctorIdx: 6, dayOffset: -15, status: AppointmentStatus.COMPLETED, diagnosis: 'Theo doi tang huyet ap', serviceIdxs: [0, 4] },
  ];

  const createdAppts: { id: string; def: ApptDef }[] = [];

  for (const def of apptDefs) {
    const doctor = activeDoctors[def.doctorIdx];
    const slotId = await pickSlot(doctor.id, def.dayOffset);

    const serviceTotal = def.serviceIdxs.reduce((sum, sIdx) => sum + Number(services[sIdx].price), 0);
    const totalAmount = Number(doctor.consultationFee) + serviceTotal;

    const appt = await prisma.appointment.create({
      data: {
        patientId: def.patientId,
        doctorId: doctor.id,
        timeSlotId: slotId,
        status: def.status,
        notes: def.notes,
        diagnosis: def.diagnosis,
        totalAmount,
        canceledAt: def.status === AppointmentStatus.CANCELED ? new Date() : null,
        services: {
          create: def.serviceIdxs.map((sIdx) => ({
            serviceId: services[sIdx].id,
            price: Number(services[sIdx].price),
          })),
        },
      },
    });
    createdAppts.push({ id: appt.id, def });
  }

  // ====== REVIEWS ======
  // Pick completed appointments and create reviews
  const completedAppts = createdAppts.filter((a) => a.def.status === AppointmentStatus.COMPLETED);

  const reviewComments: { rating: number; comment: string }[] = [
    { rating: 5, comment: 'Bac si rat tan tam va nhiet tinh, giai thich rat ro rang ve benh.' },
    { rating: 5, comment: 'Kham rat ky, dua ra phac do dieu tri hieu qua. Toi se quay lai.' },
    { rating: 4, comment: 'Bac si gioi, phong kham sach se. Cho doi hoi lau mot chut.' },
    { rating: 5, comment: 'Bac si chuyen mon cao, thai do an can voi benh nhan.' },
    { rating: 4, comment: 'Trai nghiem tot, nhan vien ho tro nhiet tinh.' },
    { rating: 3, comment: 'Bac si tot nhung phong kham hoi dong, can cai thien.' },
    { rating: 5, comment: 'Rat hai long voi dich vu, toi se gioi thieu cho ban be.' },
    { rating: 5, comment: 'Bac si tu van rat chi tiet, giup toi hieu ro tinh trang suc khoe.' },
    { rating: 4, comment: 'Kham nhanh chong, ket qua chinh xac.' },
    { rating: 5, comment: 'Tuyet voi! Bac si rat co tam.' },
    { rating: 4, comment: 'Bac si than thien, dieu tri hieu qua.' },
    { rating: 3, comment: 'Tam on, giai thich them duoc thi tot hon.' },
    { rating: 5, comment: 'Cam on bac si da giup toi rat nhieu, suc khoe da on dinh.' },
  ];

  for (let i = 0; i < completedAppts.length && i < reviewComments.length; i++) {
    const appt = completedAppts[i];
    const r = reviewComments[i];
    const doctor = activeDoctors[appt.def.doctorIdx];
    await prisma.review.create({
      data: {
        appointmentId: appt.id,
        patientId: appt.def.patientId,
        doctorId: doctor.id,
        rating: r.rating,
        comment: r.comment,
      },
    });
  }

  // ====== NOTIFICATIONS for patient1 ======
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const notifs: { title: string; body: string; type: NotificationType; isRead: boolean; daysAgo: number }[] = [
    { title: 'Nhac lich kham', body: 'Ban co lich kham voi BS. Le Van C vao ngay mai luc 08:00.', type: NotificationType.APPOINTMENT_REMINDER, isRead: false, daysAgo: 0 },
    { title: 'Lich kham da xac nhan', body: 'Lich kham voi BS. Pham Thi D da duoc xac nhan.', type: NotificationType.APPOINTMENT_CONFIRMED, isRead: false, daysAgo: 0 },
    { title: 'Canh bao huyet ap', body: 'Huyet ap cua ban dang o muc cao. Vui long kiem tra.', type: NotificationType.HEALTH_ALERT, isRead: false, daysAgo: 1 },
    { title: 'Nhac uong thuoc', body: 'Den gio uong thuoc Amlodipine 5mg.', type: NotificationType.MEDICINE_REMINDER, isRead: false, daysAgo: 1 },
    { title: 'Cap nhat he thong', body: 'Ung dung vua duoc cap nhat phien ban moi voi nhieu tinh nang.', type: NotificationType.SYSTEM, isRead: true, daysAgo: 2 },
    { title: 'Lich kham da xac nhan', body: 'Lich kham voi BS. Nguyen Van A da duoc xac nhan.', type: NotificationType.APPOINTMENT_CONFIRMED, isRead: true, daysAgo: 3 },
    { title: 'Nhac uong thuoc', body: 'Den gio uong thuoc buoi sang.', type: NotificationType.MEDICINE_REMINDER, isRead: true, daysAgo: 3 },
    { title: 'Lich kham bi huy', body: 'Lich kham ngay 28/03 da bi huy.', type: NotificationType.APPOINTMENT_CANCELED, isRead: true, daysAgo: 4 },
    { title: 'Ket qua xet nghiem', body: 'Ket qua xet nghiem mau cua ban da co.', type: NotificationType.SYSTEM, isRead: true, daysAgo: 5 },
    { title: 'Nhac kham dinh ky', body: 'Da den thoi gian kham suc khoe dinh ky hang quy.', type: NotificationType.APPOINTMENT_REMINDER, isRead: true, daysAgo: 6 },
    { title: 'Canh bao nhip tim', body: 'Nhip tim cua ban hoi cao trong 24h qua.', type: NotificationType.HEALTH_ALERT, isRead: true, daysAgo: 7 },
  ];

  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        userId: patient1.id,
        title: n.title,
        body: n.body,
        type: n.type,
        isRead: n.isRead,
        createdAt: new Date(now - n.daysAgo * day),
      },
    });
  }

  // ====== HEALTH METRICS for patient1 ======
  // 30 days of data
  const metricsData: { type: HealthMetricType; value: number; daysAgo: number }[] = [];

  // Height once
  metricsData.push({ type: HealthMetricType.HEIGHT, value: 170, daysAgo: 30 });

  for (let d = 0; d < 30; d++) {
    // Daily BP
    const bpSys = 120 + Math.floor(Math.random() * 25); // 120-144, occasional 145+
    const bpDia = 80 + Math.floor(Math.random() * 12);
    metricsData.push({ type: HealthMetricType.BLOOD_PRESSURE_SYSTOLIC, value: bpSys, daysAgo: d });
    metricsData.push({ type: HealthMetricType.BLOOD_PRESSURE_DIASTOLIC, value: bpDia, daysAgo: d });

    // Weight every other day
    if (d % 2 === 0) {
      metricsData.push({ type: HealthMetricType.WEIGHT, value: 69 + Math.random() * 2, daysAgo: d });
    }
    // Heart rate daily
    metricsData.push({ type: HealthMetricType.HEART_RATE, value: 70 + Math.floor(Math.random() * 16), daysAgo: d });

    // Blood sugar every 3 days
    if (d % 3 === 0) {
      metricsData.push({ type: HealthMetricType.BLOOD_SUGAR, value: 95 + Math.floor(Math.random() * 16), daysAgo: d });
    }
  }

  await prisma.healthMetric.createMany({
    data: metricsData.map((m) => ({
      userId: patient1.id,
      type: m.type,
      value: m.value,
      recordedAt: new Date(now - m.daysAgo * day),
    })),
  });

  // ====== HEALTH ALERTS for patient1 ======
  await prisma.healthAlert.createMany({
    data: [
      {
        userId: patient1.id,
        metricType: HealthMetricType.BLOOD_PRESSURE_SYSTOLIC,
        message: 'Huyet ap tam thu cua ban dat 145 mmHg, vuot nguong an toan.',
        severity: AlertSeverity.HIGH,
        isRead: false,
        createdAt: new Date(now - 1 * day),
      },
      {
        userId: patient1.id,
        metricType: HealthMetricType.BLOOD_PRESSURE_SYSTOLIC,
        message: 'Huyet ap tam thu lien tuc cao trong 3 ngay, can theo doi.',
        severity: AlertSeverity.MEDIUM,
        isRead: false,
        createdAt: new Date(now - 3 * day),
      },
      {
        userId: patient1.id,
        metricType: HealthMetricType.HEART_RATE,
        message: 'Nhip tim luc nghi cao hon binh thuong.',
        severity: AlertSeverity.LOW,
        isRead: true,
        createdAt: new Date(now - 5 * day),
      },
    ],
  });

  // ====== PRESCRIPTIONS for patient1 ======
  const patient1CompletedAppts = createdAppts.filter(
    (a) => a.def.patientId === patient1.id && a.def.status === AppointmentStatus.COMPLETED
  );

  if (patient1CompletedAppts.length > 0) {
    const cardioDoctor = activeDoctors[0];
    await prisma.prescription.create({
      data: {
        userId: patient1.id,
        doctorId: cardioDoctor.id,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/prescriptions/sample1.jpg',
        ocrData: {
          medicines: [
            { name: 'Amlodipine', dosage: '5mg', frequency: '1 lan/ngay', duration: '30 ngay' },
            { name: 'Aspirin', dosage: '81mg', frequency: '1 lan/ngay', duration: '30 ngay' },
          ],
          diagnosis: 'Tang huyet ap do 1',
          notes: 'Uong thuoc deu, tai kham sau 1 thang',
        },
      },
    });

    await prisma.prescription.create({
      data: {
        userId: patient1.id,
        doctorId: activeDoctors[2].id,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/prescriptions/sample2.jpg',
        ocrData: {
          medicines: [
            { name: 'Omeprazole', dosage: '20mg', frequency: '2 lan/ngay', duration: '14 ngay' },
            { name: 'Domperidone', dosage: '10mg', frequency: '3 lan/ngay', duration: '7 ngay' },
          ],
          diagnosis: 'Viem da day',
          notes: 'Tranh do an cay nong, an dung gio',
        },
      },
    });
  }

  // ====== CHAT SESSIONS for patient1 ======
  const chatTopics = [
    {
      title: 'Toi bi dau dau va sot',
      messages: [
        { role: ChatMessageRole.USER, content: 'Toi bi dau dau va sot 38.5 do tu sang nay, co nen di kham khong?' },
        { role: ChatMessageRole.ASSISTANT, content: 'Voi cac trieu chung dau dau va sot 38.5, ban nen nghi ngoi va theo doi them. Neu sot keo dai tren 2 ngay hoac kem cac trieu chung khac, ban nen di kham bac si.' },
        { role: ChatMessageRole.USER, content: 'Toi co nen uong thuoc ha sot khong?' },
        { role: ChatMessageRole.ASSISTANT, content: 'Ban co the dung Paracetamol 500mg de ha sot, uong cach nhau toi thieu 4-6 tieng. Khong qua 4g/ngay. Nho uong nhieu nuoc va nghi ngoi.' },
        { role: ChatMessageRole.USER, content: 'Cam on bac si!' },
        { role: ChatMessageRole.ASSISTANT, content: 'Khong co gi. Neu trieu chung nang hon, hay den co so y te ngay. Chuc ban som khoe!' },
      ],
    },
    {
      title: 'Dau bung vung duoi',
      messages: [
        { role: ChatMessageRole.USER, content: 'Toi bi dau bung vung duoi ben phai tu hom qua' },
        { role: ChatMessageRole.ASSISTANT, content: 'Dau bung vung ho chau phai co the la dau hieu cua viem ruot thua, day la tinh trang nguy hiem. Ban can di kham ngay neu dau tang dan, kem sot, buon non.' },
        { role: ChatMessageRole.USER, content: 'Hien tai toi co buon non nhe' },
        { role: ChatMessageRole.ASSISTANT, content: 'Voi trieu chung dau bung phai kem buon non, ban nen den benh vien gan nhat ngay de duoc kham va lam xet nghiem. Khong nen tu y dung thuoc giam dau.' },
      ],
    },
    {
      title: 'Cao huyet ap',
      messages: [
        { role: ChatMessageRole.USER, content: 'Huyet ap cua toi gan day cao 145/90, co nguy hiem khong?' },
        { role: ChatMessageRole.ASSISTANT, content: 'Huyet ap 145/90 nam o muc tang huyet ap do 1. Day la muc can theo doi va dieu chinh loi song.' },
        { role: ChatMessageRole.USER, content: 'Toi nen lam gi de giam huyet ap?' },
        { role: ChatMessageRole.ASSISTANT, content: 'Mot so cach: 1) Giam muoi trong khau phan, 2) Tap the duc deu dan 30 phut/ngay, 3) Han che ruou bia, 4) Tranh stress, 5) Theo doi huyet ap hang ngay. Neu khong cai thien, can gap bac si tim mach.' },
        { role: ChatMessageRole.USER, content: 'Co can uong thuoc ngay khong?' },
        { role: ChatMessageRole.ASSISTANT, content: 'Voi tang huyet ap do 1, bac si thuong khuyen thay doi loi song truoc. Neu sau 3-6 thang khong cai thien moi can dung thuoc. Ban nen den kham bac si tim mach de duoc tu van cu the.' },
      ],
    },
  ];

  for (const topic of chatTopics) {
    await prisma.chatSession.create({
      data: {
        userId: patient1.id,
        title: topic.title,
        messages: {
          create: topic.messages.map((m) => ({ role: m.role, content: m.content })),
        },
      },
    });
  }

  // ====== PAYMENTS ======
  // Payments for COMPLETED appointments
  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.VNPAY, PaymentMethod.MOMO];
  for (let i = 0; i < completedAppts.length; i++) {
    const appt = completedAppts[i];
    const fullAppt = await prisma.appointment.findUnique({ where: { id: appt.id } });
    if (!fullAppt) continue;
    await prisma.payment.create({
      data: {
        appointmentId: appt.id,
        userId: appt.def.patientId,
        amount: Number(fullAppt.totalAmount),
        method: paymentMethods[i % paymentMethods.length],
        status: PaymentStatus.PAID,
        transactionId: `TXN-${Date.now()}-${i}`,
        paidAt: new Date(now - (i + 1) * day),
      },
    });
  }

  // 1 PENDING payment for a confirmed appointment
  const confirmedAppt = createdAppts.find((a) => a.def.status === AppointmentStatus.CONFIRMED);
  if (confirmedAppt) {
    const fullAppt = await prisma.appointment.findUnique({ where: { id: confirmedAppt.id } });
    if (fullAppt) {
      await prisma.payment.create({
        data: {
          appointmentId: confirmedAppt.id,
          userId: confirmedAppt.def.patientId,
          amount: Number(fullAppt.totalAmount),
          method: PaymentMethod.VNPAY,
          status: PaymentStatus.PENDING,
        },
      });
    }
  }

  console.log('Seed completed!');
  console.log('Admin:   admin@healthcare.com / password123');
  console.log('Doctor:  doctor1@healthcare.com / password123');
  console.log('Patient: patient1@gmail.com / password123');
  console.log(`Created: ${doctors.length} doctors (${activeDoctors.length} active), ${patients.length} patients`);
  console.log(`Created: ${createdAppts.length} appointments, ${completedAppts.length} reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
