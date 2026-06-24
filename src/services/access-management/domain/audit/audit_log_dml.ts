// -------- Data Layer -------- //
import { AuditLogModel } from './audit_log.schema';
// -------- Interfaces -------- //
import type { AuditEntry, AuditFilter, AuditRecord } from './interface';

const transformData = (d: any): AuditRecord => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  subjectId: String(d.subjectId),
  action: d.action,
  resourceType: d.resourceType,
  resourceId: d.resourceId,
  decision: d.decision,
  reason: d.reason,
  matchedRole: d.matchedRole ?? null,
  createdAt: new Date(d.createdAt).toISOString(),
});

const record = async (entry: AuditEntry): Promise<void> => {
  await AuditLogModel.create(entry);
};

const query = async (tenantId: string, filter: AuditFilter): Promise<AuditRecord[]> => {
  const q: Record<string, unknown> = { tenantId };
  if (filter.decision) q.decision = filter.decision;
  if (filter.subjectId) q.subjectId = filter.subjectId;
  return (await AuditLogModel.find(q).sort({ createdAt: -1 }).limit(100).lean()).map(transformData);
};

export const AuditLogDao = { record, query };
