// -------- Packages -------- //
import type { Decision } from '@contracts';

// ==================== ENTITY ====================

interface AuditEntry {
  tenantId: string;
  subjectId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  decision: Decision;
  reason: string;
  matchedRole: string | null;
}

interface AuditRecord extends AuditEntry {
  id: string;
  createdAt: string;
}

interface AuditFilter {
  decision?: string;
  subjectId?: string;
}

export type { AuditEntry, AuditRecord, AuditFilter };
