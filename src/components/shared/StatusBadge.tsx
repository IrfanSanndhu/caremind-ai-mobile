import { Badge, type BadgeVariant } from '@/components/ui';
import type {
  AppointmentStatus,
  AiOutputStatus,
  DocumentProcessingStatus,
  ConsentStatus,
} from '@/types';

const appointmentStatusConfig: Record<
  AppointmentStatus,
  { label: string; variant: BadgeVariant; pulse?: boolean }
> = {
  scheduled: { label: 'Scheduled', variant: 'primary' },
  pending_approval: { label: 'Pending Approval', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning', pulse: true },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

const aiOutputStatusConfig: Record<AiOutputStatus, { label: string; variant: BadgeVariant }> = {
  pending_review: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  edited: { label: 'Edited', variant: 'purple' },
};

const documentStatusConfig: Record<
  DocumentProcessingStatus,
  { label: string; variant: BadgeVariant; pulse?: boolean }
> = {
  pending: { label: 'Pending', variant: 'gray' },
  processing: { label: 'Processing', variant: 'primary', pulse: true },
  ready: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
};

const consentStatusConfig: Record<ConsentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Consent Pending', variant: 'gray' },
  accepted: { label: 'Consent Accepted', variant: 'success' },
  declined: { label: 'Consent Declined', variant: 'danger' },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = appointmentStatusConfig[status];
  return (
    <Badge variant={config.variant} pulse={config.pulse}>
      {config.label}
    </Badge>
  );
}

export function AiOutputStatusBadge({ status }: { status: AiOutputStatus }) {
  const config = aiOutputStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function DocumentStatusBadge({ status }: { status: DocumentProcessingStatus }) {
  const config = documentStatusConfig[status];
  return (
    <Badge variant={config.variant} pulse={config.pulse}>
      {config.label}
    </Badge>
  );
}

export function ConsentStatusBadge({ status }: { status: ConsentStatus }) {
  const config = consentStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
