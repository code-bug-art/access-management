// -------- Domain Layer -------- //
import { AuditLogDao } from '../../domain/audit';
import type { AuditFilter, AuditRecord } from '../../domain/audit/interface';

const getAuditTrail = (tenantId: string, filter: AuditFilter): Promise<AuditRecord[]> =>
  AuditLogDao.query(tenantId, filter);

export { getAuditTrail };
