// -------- Packages -------- //
import type { AuthzResponse, TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../domain/access_control';
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

type Approved = ExpenseEntity & { _authz: AuthzResponse };

/** Approve the current level. access-management decides if the caller may sign this step's role. */
const approveExpense = async (claims: TokenClaims, id: string): Promise<Outcome<Approved>> => {
  const expense = await ExpenseDao.findById(id);
  if (!expense) return { kind: 'not_found' };
  if (expense.status !== 'pending') return { kind: 'conflict', message: `expense is ${expense.status}, not awaiting approval` };

  const step = expense.chain[expense.currentStep];
  if (!step) return { kind: 'conflict', message: 'no current approval step' };

  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'expense:approve',
    resource: { type: 'expense', id: expense.id, tenantId: expense.tenantId, ownerId: expense.ownerId, amount: expense.amount, requiredRoleId: step.roleId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };

  const nextStep = expense.currentStep + 1;
  const status = nextStep >= expense.chain.length ? 'approved' : 'pending';
  const updated = await ExpenseDao.recordApproval(id, expense.currentStep, claims.sub, nextStep, status);
  return { kind: 'ok', data: { ...updated!, _authz: decision } };
};

export { approveExpense };
