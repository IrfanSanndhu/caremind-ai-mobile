import type { AuditLog } from '@/types';

const ACTION_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
  DELETE_USER: 'danger',
  DELETE_DOCUMENT: 'danger',
  REJECT_OUTPUT: 'danger',
  APPROVE_OUTPUT: 'success',
  RECORD_CONSENT: 'success',
  INVITE_USER: 'primary',
  JOIN_CONSULTATION: 'primary',
  START_RECORDING: 'warning',
  STOP_RECORDING: 'warning',
  VIEW_AUDIT_LOG: 'gray',
  READ_RECORD: 'gray',
};

export function getAuditActionBadgeVariant(
  action: string,
): 'primary' | 'success' | 'warning' | 'danger' | 'gray' {
  return ACTION_VARIANT[action] ?? 'gray';
}

export function getAuditLogDisplayName(log: AuditLog): string {
  return log.userName ?? log.user?.name ?? log.user?.email ?? 'Unknown user';
}

export function getAuditLogSummary(log: AuditLog): string {
  if (log.summary) return log.summary;
  return `${log.action} — ${log.resourceType}`;
}
