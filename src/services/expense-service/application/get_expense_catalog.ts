// -------- Domain Layer -------- //
import { ExpenseDao } from '../domain/expense';
import type { ExpenseEntity } from '../domain/expense/interface';

/** Dev-only: all expenses (raw ids) for the demo UI's pickers; the UI joins names from /directory. */
const getExpenseCatalog = (): Promise<ExpenseEntity[]> => ExpenseDao.listAll();

export { getExpenseCatalog };
