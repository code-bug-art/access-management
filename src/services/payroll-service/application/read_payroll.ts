// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { PayrollRecordDao } from '../domain/payroll_record';
import type { PayrollRecordEntity } from '../domain/payroll_record/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** Read a payroll record — requires payroll:read (need-to-know, or the owner for their own). */
const readPayroll = async (claims: TokenClaims, id: string): Promise<Outcome<PayrollRecordEntity>> => {
  const record = await PayrollRecordDao.findById(id);
  if (!record) return { kind: 'not_found' };

  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'payroll:read',
    resource: { type: 'payroll', id: record.id, tenantId: record.tenantId, ownerId: record.ownerId, orgUnitId: record.orgUnitId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };
  return { kind: 'ok', data: record };
};

export { readPayroll };
