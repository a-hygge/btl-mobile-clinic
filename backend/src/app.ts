import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { prisma } from './config/database';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes - will be added per module
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/doctors', doctorRoutes);
// app.use('/api/v1/clinics', clinicRoutes);
// app.use('/api/v1/specialties', specialtyRoutes);
// app.use('/api/v1/services', serviceRoutes);
// app.use('/api/v1/appointments', appointmentRoutes);
// app.use('/api/v1/schedules', scheduleRoutes);
// app.use('/api/v1/reviews', reviewRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/health-metrics', healthRoutes);
// app.use('/api/v1/notifications', notificationRoutes);
// app.use('/api/v1/prescriptions', prescriptionRoutes);
// app.use('/api/v1/ai', aiRoutes);
// app.use('/api/v1/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export default app;
