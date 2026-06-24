// -------- Data Layer -------- //
import { PayrollRecordModel } from './payroll_record.schema';
// -------- Interfaces -------- //
import type { PayrollRecordEntity } from './interface';

const transformData = (d: any): PayrollRecordEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  ownerId: String(d.ownerId),
  orgUnitId: String(d.orgUnitId),
  grossPay: d.grossPay,
});

const findById = async (id: string): Promise<PayrollRecordEntity | null> => {
  const d = await PayrollRecordModel.findById(id).lean();
  return d ? transformData(d) : null;
};

const listAll = async (): Promise<PayrollRecordEntity[]> => {
  return (await PayrollRecordModel.find().lean()).map(transformData);
};

export const PayrollRecordDao = { findById, listAll };
