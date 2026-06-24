// -------- Domain Layer -------- //
import { PayrollRecordDao } from '../domain/payroll_record';
import type { PayrollRecordEntity } from '../domain/payroll_record/interface';

/** Dev-only: all payroll records (raw ids) for the demo UI's pickers. */
const getPayrollCatalog = (): Promise<PayrollRecordEntity[]> => PayrollRecordDao.listAll();

export { getPayrollCatalog };
