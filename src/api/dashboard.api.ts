import { apiClient, unwrap } from './client';
import { mapAppointment } from './mappers';
import type { Appointment } from '@/types';

export interface DoctorDashboardStats {
  todayAppointments: number;
  pendingAiReviews: number;
  pendingBookingRequests: number;
  totalScheduled: number;
  inProgressCount: number;
}

export interface DoctorDashboardData {
  stats: DoctorDashboardStats;
  pendingBookingRequests: Appointment[];
  inProgressAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}

export interface PatientDashboardStats {
  todayAppointments: number;
  totalScheduled: number;
  inProgressCount: number;
  pendingBookingRequests: number;
}

export interface PatientDashboardData {
  stats: PatientDashboardStats;
  pendingBookingRequests: Appointment[];
  inProgressAppointments: Appointment[];
  upcomingAppointments: Appointment[];
}

export const dashboardApi = {
  getDoctor: async (): Promise<DoctorDashboardData> => {
    const res = await apiClient.get('/api/dashboard/doctor');
    const raw = unwrap(res) as {
      stats: DoctorDashboardStats;
      pendingBookingRequests?: Record<string, unknown>[];
      inProgressAppointments: Record<string, unknown>[];
      upcomingAppointments: Record<string, unknown>[];
    };
    return {
      stats: {
        ...raw.stats,
        pendingBookingRequests: raw.stats.pendingBookingRequests ?? 0,
      },
      pendingBookingRequests: (raw.pendingBookingRequests ?? []).map(mapAppointment),
      inProgressAppointments: (raw.inProgressAppointments ?? []).map(mapAppointment),
      upcomingAppointments: (raw.upcomingAppointments ?? []).map(mapAppointment),
    };
  },

  getPatient: async (): Promise<PatientDashboardData> => {
    const res = await apiClient.get('/api/dashboard/patient');
    const raw = unwrap(res) as {
      stats: PatientDashboardStats;
      pendingBookingRequests?: Record<string, unknown>[];
      inProgressAppointments: Record<string, unknown>[];
      upcomingAppointments: Record<string, unknown>[];
    };
    return {
      stats: {
        ...raw.stats,
        pendingBookingRequests: raw.stats.pendingBookingRequests ?? 0,
      },
      pendingBookingRequests: (raw.pendingBookingRequests ?? []).map(mapAppointment),
      inProgressAppointments: (raw.inProgressAppointments ?? []).map(mapAppointment),
      upcomingAppointments: (raw.upcomingAppointments ?? []).map(mapAppointment),
    };
  },
};

export const dashboardKeys = {
  doctor: ['dashboard', 'doctor'] as const,
  patient: ['dashboard', 'patient'] as const,
};
