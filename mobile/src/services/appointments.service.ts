import { api, extractData, extractPaginatedData } from './api';
import type { Appointment } from '../types';

interface PaginatedResponse<T> {
  data: T;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getMyAppointments(params?: {
  page?: number;
  limit?: number;
  status?: Appointment['status'];
}): Promise<PaginatedResponse<Appointment[]>> {
  const response = await api.get('/appointments/me', { params });
  return extractPaginatedData<Appointment[]>(response);
}

export async function createAppointment(input: {
  doctorId: string;
  timeSlotId: string;
  serviceIds?: string[];
  notes?: string;
}): Promise<Appointment> {
  const response = await api.post('/appointments', input);
  return extractData<Appointment>(response);
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const response = await api.put(`/appointments/${id}/cancel`);
  return extractData<Appointment>(response);
}
