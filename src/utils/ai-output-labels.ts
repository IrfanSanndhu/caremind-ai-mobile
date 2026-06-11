import type { AiOutputType } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  soap_note: 'SOAP Note',
  clinical_summary: 'Clinical Summary',
  patient_summary: 'Patient Summary',
  follow_up_instructions: 'Follow-up Instructions',
  /** @deprecated DB value; kept for any stale client data */
  followup_instructions: 'Follow-up Instructions',
};

export function getAiOutputTypeLabel(type: string): string {
  return (
    TYPE_LABELS[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/** Normalize API enum to canonical AiOutputType */
export function normalizeAiOutputType(type: string): AiOutputType {
  if (type === 'followup_instructions') return 'follow_up_instructions';
  return type as AiOutputType;
}
