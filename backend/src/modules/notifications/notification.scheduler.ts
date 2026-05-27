/** Scheduler chạy cron job định kỳ để gửi nhắc lịch hẹn và lời mời đánh giá sau khi khám. */
import cron from 'node-cron';
import { prisma } from '../../config/database';
import { NotificationService } from './notification.service';

/**
 * Scheduler quản lý các cron job tạo thông báo tự động (nhắc lịch hẹn và prompt đánh giá).
 */
export class NotificationScheduler {
  /**
   * Khởi chạy 2 cron job: nhắc lịch hẹn (15 phút/lần) và nhắc đánh giá sau khám (30 phút/lần).
   */
  static start() {
    // Every 15 minutes: check upcoming appointments
    cron.schedule('*/15 * * * *', () => {
      void this.checkUpcomingAppointments();
    });

    // Every 30 minutes: check completed appointments without reviews
    cron.schedule('*/30 * * * *', () => {
      void this.checkPendingReviews();
    });

    console.log('NotificationScheduler started');
  }

  /**
   * Quét các lịch hẹn sắp diễn ra và tạo thông báo nhắc 24h trước + 1h trước giờ khám.
   * Có cơ chế chống gửi trùng bằng cách kiểm tra notification đã tồn tại trong cửa sổ thời gian.
   */
  static async checkUpcomingAppointments() {
    const now = new Date();

    // Find appointments in 23h45m - 24h15m window (sent 24h before)
    const in24hStart = new Date(now.getTime() + 23.75 * 3600 * 1000);
    const in24hEnd = new Date(now.getTime() + 24.25 * 3600 * 1000);

    // Find appointments in 0h45m - 1h15m window (sent 1h before)
    const in1hStart = new Date(now.getTime() + 0.75 * 3600 * 1000);
    const in1hEnd = new Date(now.getTime() + 1.25 * 3600 * 1000);

    // Get appointments and send notifications
    // Note: appointment date and timeSlot startTime need to be combined
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        timeSlot: true,
        doctor: { include: { user: true, specialty: true } },
      },
    });

    for (const appt of appointments) {
      if (!appt.timeSlot) continue;

      // Build full date from timeSlot.date + startTime
      const dateStr = appt.timeSlot.date.toISOString().slice(0, 10);
      const apptDateTime = new Date(`${dateStr}T${appt.timeSlot.startTime}:00.000Z`);

      // Check 24h reminder
      if (apptDateTime >= in24hStart && apptDateTime <= in24hEnd) {
        // Check if already sent (look in notifications table for matching one)
        const existing = await prisma.notification.findFirst({
          where: {
            userId: appt.patientId,
            type: 'APPOINTMENT_REMINDER',
            data: { path: ['appointmentId'], equals: appt.id },
            createdAt: { gte: new Date(now.getTime() - 25 * 3600 * 1000) },
          },
        });
        if (!existing) {
          await NotificationService.createNotification(
            appt.patientId,
            'Appointment Reminder',
            `Your appointment with Dr. ${appt.doctor.user.name} is tomorrow at ${appt.timeSlot.startTime}.`,
            'APPOINTMENT_REMINDER',
            { appointmentId: appt.id, reminderType: '24h' }
          );
        }
      }

      // Check 1h reminder
      if (apptDateTime >= in1hStart && apptDateTime <= in1hEnd) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: appt.patientId,
            type: 'APPOINTMENT_REMINDER',
            data: { path: ['reminderType'], equals: '1h' },
            createdAt: { gte: new Date(now.getTime() - 2 * 3600 * 1000) },
          },
        });
        if (!existing) {
          await NotificationService.createNotification(
            appt.patientId,
            'Appointment Soon',
            `Your appointment with Dr. ${appt.doctor.user.name} is in 1 hour. Please arrive 15 minutes early.`,
            'APPOINTMENT_REMINDER',
            { appointmentId: appt.id, reminderType: '1h' }
          );
        }
      }
    }
  }

  /**
   * Tìm các lịch hẹn đã hoàn thành trong 7 ngày qua nhưng chưa có review,
   * gửi thông báo mời bệnh nhân đánh giá bác sĩ.
   */
  static async checkPendingReviews() {
    const completed = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        review: null,
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) }, // last 7 days
      },
      include: {
        doctor: { include: { user: true } },
      },
    });

    for (const appt of completed) {
      // Check if review prompt already sent
      const existing = await prisma.notification.findFirst({
        where: {
          userId: appt.patientId,
          type: 'SYSTEM',
          data: { path: ['promptType'], equals: 'review' },
        },
      });
      if (!existing) {
        await NotificationService.createNotification(
          appt.patientId,
          'How was your visit?',
          `Please share your experience with Dr. ${appt.doctor.user.name}.`,
          'SYSTEM',
          { appointmentId: appt.id, promptType: 'review' }
        );
      }
    }
  }
}
