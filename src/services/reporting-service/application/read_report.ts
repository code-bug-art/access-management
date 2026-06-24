// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ReportDao } from '../domain/report';
import type { ReportEntity } from '../domain/report/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** Read a report — requires report:read. */
const readReport = async (claims: TokenClaims, id: string): Promise<Outcome<ReportEntity>> => {
  const report = await ReportDao.findById(id);
  if (!report) return { kind: 'not_found' };

  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'report:read',
    resource: { type: 'report', id: report.id, tenantId: report.tenantId, ownerId: report.ownerId, orgUnitId: report.orgUnitId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };
  return { kind: 'ok', data: report };
};

export { readReport };
