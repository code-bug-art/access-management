// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** A valid approver of the current step may reject the expense. */
const rejectExpense = async (claims: TokenClaims, id: string): Promise<Outcome<ExpenseEntity>> => {
  const expense = await ExpenseDao.findById(id);
  if (!expense) return { kind: 'not_found' };
  if (expense.status !== 'pending') return { kind: 'conflict', message: `expense is ${expense.status}` };

  const step = expense.chain[expense.currentStep];
  if (!step) return { kind: 'conflict', message: 'no current approval step' };

  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'expense:approve',
    resource: { type: 'expense', id: expense.id, tenantId: expense.tenantId, ownerId: expense.ownerId, amount: expense.amount, requiredRoleId: step.roleId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };

  const updated = await ExpenseDao.reject(id);
  return { kind: 'ok', data: updated! };
};

export { rejectExpense };
