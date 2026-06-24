// -------- Packages -------- //
import type { TokenClaims } from '@contracts';
// -------- Domain Layer -------- //
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';

/** The caller's own expenses (drafts + in-flight + decided). */
const listMyExpenses = (claims: TokenClaims): Promise<ExpenseEntity[]> =>
  ExpenseDao.listByOwner(claims.tenantId, claims.sub);

export { listMyExpenses };
