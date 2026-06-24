// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import { ExpenseWorkflowDao } from '../../domain/expense_workflow';
import type { ExpenseWorkflowEntity } from '../../domain/expense_workflow/interface';

/** The tenant's configured expense approval workflow (empty steps if none set). */
const getWorkflow = (claims: TokenClaims): Promise<ExpenseWorkflowEntity> => ExpenseWorkflowDao.get(claims.tenantId);

export { getWorkflow };
