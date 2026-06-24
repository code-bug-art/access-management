// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';

/** Pending expenses the caller can sign right now: the current step's role check passes (and not own). */
const listPendingApprovals = async (claims: TokenClaims): Promise<ExpenseEntity[]> => {
  const pending = await ExpenseDao.listPending(claims.tenantId);
  const inbox: ExpenseEntity[] = [];
  for (const expense of pending) {
    const step = expense.chain[expense.currentStep];
    if (!step || expense.ownerId === claims.sub) continue;
    const decision = await AccessControl.checkAccess({
      subject: { id: claims.sub, tenantId: claims.tenantId },
      action: 'expense:approve',
      resource: { type: 'expense', id: expense.id, tenantId: expense.tenantId, ownerId: expense.ownerId, amount: expense.amount, requiredRoleId: step.roleId },
    });
    if (decision.decision === 'ALLOW') inbox.push(expense);
  }
  return inbox;
};

export { listPendingApprovals };
