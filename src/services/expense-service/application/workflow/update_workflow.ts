// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import * as AccessControl from '../../domain/access_control';
import { ExpenseWorkflowDao } from '../../domain/expense_workflow';
import type { ExpenseWorkflowEntity, WorkflowStep } from '../../domain/expense_workflow/interface';
// -------- Types -------- //
import type { Outcome } from '../outcome';

/** Configure the approval workflow. Gated by admin:write (decided by access-management). */
const updateWorkflow = async (claims: TokenClaims, steps: WorkflowStep[]): Promise<Outcome<ExpenseWorkflowEntity>> => {
  const decision = await AccessControl.checkAccess({
    subject: { id: claims.sub, tenantId: claims.tenantId },
    action: 'admin:write',
    resource: { type: 'admin', id: 'expense-workflow', tenantId: claims.tenantId },
  });
  if (decision.decision === 'DENY') return { kind: 'denied', decision };

  // Re-number steps by their submitted order so `order` is always contiguous.
  const normalized = steps.map((s, i) => ({ ...s, order: i + 1 }));
  const saved = await ExpenseWorkflowDao.upsert(claims.tenantId, normalized);
  return { kind: 'ok', data: saved };
};

export { updateWorkflow };
