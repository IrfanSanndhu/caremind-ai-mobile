import { apiClient, unwrap } from './client';
import { listQueryParams, toPaginatedResponse } from './mappers';
import type { Patient, PatientGender, PatientSession, PaginatedResponse } from '@/types';

export interface ListPatientsParams {
  page?: number;
  pageSize?: number;
  doctorId?: string;
}

interface BackendPatientsPage {
  patients: Array<{
    id: string;
    userId: string;
    orgId: string;
    firstName: string;
    lastName: string;
    gender: PatientGender | null;
    dateOfBirth: string | null;
    phone: string | null;
    email: string;
    sessionCount: number;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

interface BackendSessionsPage {
  sessions: PatientSession[];
  total: number;
  page: number;
  limit: number;
}

function mapPatient(raw: BackendPatientsPage['patients'][number]): Patient {
  return {
    id: raw.id,
    userId: raw.userId,
    orgId: raw.orgId,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    gender: raw.gender ?? undefined,
    dateOfBirth: raw.dateOfBirth ?? undefined,
    phone: raw.phone ?? undefined,
    sessionCount: raw.sessionCount,
  };
}

export const patientsApi = {
  list: async (params?: ListPatientsParams): Promise<PaginatedResponse<Patient>> => {
    const pageSize = Math.min(params?.pageSize ?? 20, 100);
    const res = await apiClient.get('/api/patients', {
      params: listQueryParams({
        page: params?.page,
        limit: pageSize,
        doctorId: params?.doctorId,
      } as Record<string, string | number | undefined>),
    });
    const data = unwrap(res) as BackendPatientsPage;
    return toPaginatedResponse(
      (data.patients ?? []).map(mapPatient),
      data.total ?? 0,
      data.page ?? 1,
      data.limit ?? 20,
    );
  },

  reassignPrimaryDoctor: async (
    patientId: string,
    doctorId: string,
  ): Promise<{ patientId: string; primaryDoctorId: string; primaryDoctorName: string }> => {
    const res = await apiClient.patch(`/api/patients/${patientId}/primary-doctor`, { doctorId });
    return unwrap(res) as {
      patientId: string;
      primaryDoctorId: string;
      primaryDoctorName: string;
    };
  },

  get: async (id: string): Promise<Patient> => {
    const res = await apiClient.get(`/api/patients/${id}`);
    return mapPatient(unwrap(res) as BackendPatientsPage['patients'][number]);
  },

  listSessions: async (
    patientId: string,
    params?: { page?: number; pageSize?: number },
  ): Promise<PaginatedResponse<PatientSession>> => {
    const res = await apiClient.get(`/api/patients/${patientId}/sessions`, {
      params: listQueryParams({
        page: params?.page,
        limit: params?.pageSize ?? 20,
      } as Record<string, string | number | undefined>),
    });
    const data = unwrap(res) as BackendSessionsPage;
    return toPaginatedResponse(
      data.sessions ?? [],
      data.total ?? 0,
      data.page ?? 1,
      data.limit ?? 20,
    );
  },
};

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params?: ListPatientsParams) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  sessions: (id: string, params?: { page?: number; pageSize?: number }) =>
    [...patientKeys.all, 'sessions', id, params] as const,
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export function formatGender(gender?: PatientGender | null): string {
  if (!gender) return '—';
  const found = GENDER_OPTIONS.find((o) => o.value === gender);
  return found?.label ?? gender;
}
