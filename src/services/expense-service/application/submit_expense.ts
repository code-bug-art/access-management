// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import { ExpenseDao } from '../domain/expense';
import { ExpenseWorkflowDao, computeChain } from '../domain/expense_workflow';
import type { ChainStep, ExpenseEntity } from '../domain/expense/interface';
// -------- Types -------- //
import type { Outcome } from './outcome';

/** Owner submits a draft: snapshot the configured approval chain for its amount and start routing. */
const submitExpense = async (claims: TokenClaims, id: string): Promise<Outcome<ExpenseEntity>> => {
  const expense = await ExpenseDao.findById(id);
  if (!expense) return { kind: 'not_found' };
  if (expense.ownerId !== claims.sub) {
    return { kind: 'denied', decision: { decision: 'DENY', reason: 'only the owner can submit this expense' } };
  }
  if (expense.status !== 'draft') return { kind: 'conflict', message: `expense is already ${expense.status}` };

  const workflow = await ExpenseWorkflowDao.get(claims.tenantId);
  const chain: ChainStep[] = computeChain(workflow.steps, expense.amount).map((s) => ({
    order: s.order,
    name: s.name,
    roleId: s.roleId,
    roleName: s.roleName,
    state: 'pending',
    approverId: null,
  }));
  const status = chain.length === 0 ? 'approved' : 'pending';
  const updated = await ExpenseDao.submit(id, chain, status);
  return { kind: 'ok', data: updated! };
};

export { submitExpense };
