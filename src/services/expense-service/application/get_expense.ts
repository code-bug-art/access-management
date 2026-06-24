// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** Read one expense — loaded without a tenant filter so the PDP enforces the cross-tenant gate. */
const getExpense = async (claims: TokenClaims, id: string): Promise<Outcome<ExpenseEntity>> => {
  const expense = await ExpenseDao.findById(id);
  if (!expense) return { kind: 'not_found' };

  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'expense:read',
    resource: { type: 'expense', id: expense.id, tenantId: expense.tenantId, ownerId: expense.ownerId, orgUnitId: expense.orgUnitId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };
  return { kind: 'ok', data: expense };
};

export { getExpense };
