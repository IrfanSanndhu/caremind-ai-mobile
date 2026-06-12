import { apiClient, unwrap } from './client';
import { mapAppointment } from './mappers';
import type { Appointment } from '@/types';

export type SlotDuration = 'thirty' | 'sixty';

export interface BookableDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string | null;
  fullName: string;
}

export interface DoctorBookingSettings {
  doctorId: string;
  orgId: string;
  slotDurationMinutes: SlotDuration;
  minLeadTimeHours: number;
  maxAdvanceDays: number;
  timezone: string;
  updatedAt: string;
}

export interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DoctorSlotsResponse {
  doctorId: string;
  slotDurationMinutes: SlotDuration;
  timezone: string;
  slots: string[];
}

export const bookingApi = {
  listDoctors: async (): Promise<BookableDoctor[]> => {
    const res = await apiClient.get('/api/booking/doctors');
    const data = unwrap(res) as { doctors: BookableDoctor[] };
    return data.doctors ?? [];
  },

  getDoctorSlots: async (doctorId: string): Promise<DoctorSlotsResponse> => {
    const res = await apiClient.get(`/api/booking/doctors/${doctorId}/slots`);
    return unwrap(res) as DoctorSlotsResponse;
  },

  getMyConfig: async (): Promise<{ settings: DoctorBookingSettings; rules: AvailabilityRule[] }> => {
    const res = await apiClient.get('/api/booking/settings');
    return unwrap(res) as { settings: DoctorBookingSettings; rules: AvailabilityRule[] };
  },

  updateSettings: async (payload: Partial<{
    slotDurationMinutes: SlotDuration;
    minLeadTimeHours: number;
    maxAdvanceDays: number;
    timezone: string;
  }>): Promise<DoctorBookingSettings> => {
    const res = await apiClient.patch('/api/booking/settings', payload);
    return unwrap(res) as DoctorBookingSettings;
  },

  updateAvailability: async (rules: Omit<AvailabilityRule, 'id'>[]): Promise<AvailabilityRule[]> => {
    const res = await apiClient.put('/api/booking/availability', { rules });
    const data = unwrap(res) as { rules: AvailabilityRule[] };
    return data.rules;
  },

  bookAppointment: async (payload: { doctorId: string; scheduledAt: string }): Promise<Appointment> => {
    const res = await apiClient.post('/api/booking/appointments', payload);
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },

  approveRequest: async (appointmentId: string): Promise<Appointment> => {
    const res = await apiClient.post(`/api/booking/appointments/${appointmentId}/approve`);
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },

  rejectRequest: async (appointmentId: string): Promise<Appointment> => {
    const res = await apiClient.post(`/api/booking/appointments/${appointmentId}/reject`);
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },
};

export const bookingKeys = {
  all: ['booking'] as const,
  doctors: () => [...bookingKeys.all, 'doctors'] as const,
  slots: (doctorId: string) => [...bookingKeys.all, 'slots', doctorId] as const,
  config: () => [...bookingKeys.all, 'config'] as const,
};
