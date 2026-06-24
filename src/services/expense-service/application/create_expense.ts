// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** Create a draft expense owned by the caller (RBAC: expense:create). */
const createExpense = async (claims: TokenClaims, amount: number): Promise<Outcome<ExpenseEntity>> => {
  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'expense:create',
    resource: { type: 'expense', id: 'new', tenantId: claims.tenantId, ownerId: claims.sub, orgUnitId: claims.orgUnitId, amount },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };

  const expense = await ExpenseDao.create({ tenantId: claims.tenantId, ownerId: claims.sub, orgUnitId: claims.orgUnitId, amount });
  return { kind: 'ok', data: expense };
};

export { createExpense };
