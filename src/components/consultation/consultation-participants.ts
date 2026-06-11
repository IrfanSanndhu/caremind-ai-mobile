import type { Appointment } from '@/types';

export type ParticipantLabelMap = Record<string, string>;

export function buildParticipantLabels(appointment: Appointment): ParticipantLabelMap {
  const labels: ParticipantLabelMap = {};
  if (appointment.patient?.userId) {
    labels[appointment.patient.userId] =
      `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
  }
  if (appointment.doctor?.userId) {
    labels[appointment.doctor.userId] =
      `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`.trim();
  }
  return labels;
}

export function getCallTitle(appointment: Appointment): string {
  const patient = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : 'Patient';
  const doctor = appointment.doctor
    ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`.trim()
    : 'Doctor';
  return `${doctor} · ${patient}`;
}

export function resolveParticipantLabel(
  identity: string,
  name: string | undefined,
  labels: ParticipantLabelMap,
): string {
  if (labels[identity]) return labels[identity];
  if (name && name !== identity && !name.match(/^[0-9a-f-]{36}$/i)) return name;
  return name || 'Participant';
}
