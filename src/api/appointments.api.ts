import { apiClient, unwrap } from './client';
import { listQueryParams, mapAppointment, toPaginatedResponse } from './mappers';
import type { Appointment, AppointmentStatus, PaginatedResponse } from '@/types';

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
}

export interface ListAppointmentsParams {
  status?: AppointmentStatus;
  patientId?: string;
  doctorId?: string;
  page?: number;
  pageSize?: number;
}

interface BackendAppointmentsPage {
  appointments: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

export const appointmentsApi = {
  list: async (params?: ListAppointmentsParams): Promise<PaginatedResponse<Appointment>> => {
    const res = await apiClient.get('/api/appointments', {
      params: listQueryParams(params as Record<string, string | number | undefined>),
    });
    const data = unwrap(res) as BackendAppointmentsPage;
    return toPaginatedResponse(
      (data.appointments ?? []).map(mapAppointment),
      data.total ?? 0,
      data.page ?? 1,
      data.limit ?? 20
    );
  },

  get: async (id: string): Promise<Appointment> => {
    const res = await apiClient.get(`/api/appointments/${id}`);
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },

  create: async (payload: CreateAppointmentPayload): Promise<Appointment> => {
    const res = await apiClient.post('/api/appointments', payload);
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },

  /** DELETE /api/appointments/:id — marks appointment as cancelled */
  cancel: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/appointments/${id}`);
  },

  /** POST /api/appointments/:id/consent */
  updateConsent: async (id: string, consentStatus: 'accepted' | 'declined'): Promise<Appointment> => {
    const res = await apiClient.post(`/api/appointments/${id}/consent`, { consentStatus });
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },

  /** PATCH /api/appointments/:id — update status */
  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const res = await apiClient.patch(`/api/appointments/${id}`, { status });
    return mapAppointment(unwrap(res) as Record<string, unknown>);
  },
};

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (params?: ListAppointmentsParams) => [...appointmentKeys.lists(), params] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};
