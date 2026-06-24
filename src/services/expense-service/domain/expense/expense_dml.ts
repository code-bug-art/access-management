// -------- Data Layer -------- //
import { ExpenseModel } from './expense.schema';
// -------- Interfaces -------- //
import type { ChainStep, CreateExpenseData, ExpenseEntity, ExpenseStatus } from './interface';

const transformData = (d: any): ExpenseEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  ownerId: String(d.ownerId),
  orgUnitId: String(d.orgUnitId),
  amount: d.amount,
  status: d.status,
  chain: (d.chain ?? []).map((s: any) => ({
    order: s.order,
    name: s.name,
    roleId: String(s.roleId),
    roleName: s.roleName,
    state: s.state,
    approverId: s.approverId ? String(s.approverId) : null,
  })),
  currentStep: d.currentStep ?? 0,
});

const create = async (data: CreateExpenseData): Promise<ExpenseEntity> => {
  const created = await ExpenseModel.create(data);
  return transformData(created.toObject());
};

const findById = async (id: string): Promise<ExpenseEntity | null> => {
  const d = await ExpenseModel.findById(id).lean();
  return d ? transformData(d) : null;
};

const listByOwner = async (tenantId: string, ownerId: string): Promise<ExpenseEntity[]> => {
  return (await ExpenseModel.find({ tenantId, ownerId }).lean()).map(transformData);
};

const listPending = async (tenantId: string): Promise<ExpenseEntity[]> => {
  return (await ExpenseModel.find({ tenantId, status: 'pending' }).lean()).map(transformData);
};

const listAll = async (): Promise<ExpenseEntity[]> => {
  return (await ExpenseModel.find().lean()).map(transformData);
};

/** Move a draft into the approval flow with its computed chain. */
const submit = async (id: string, chain: ChainStep[], status: ExpenseStatus): Promise<ExpenseEntity | null> => {
  const d = await ExpenseModel.findByIdAndUpdate(id, { chain, currentStep: 0, status }, { new: true }).lean();
  return d ? transformData(d) : null;
};

/** Record approval of the current step and advance (or finalize). */
const recordApproval = async (
  id: string,
  stepIndex: number,
  approverId: string,
  nextStep: number,
  status: ExpenseStatus
): Promise<ExpenseEntity | null> => {
  const d = await ExpenseModel.findByIdAndUpdate(
    id,
    {
      $set: {
        [`chain.${stepIndex}.state`]: 'approved',
        [`chain.${stepIndex}.approverId`]: approverId,
        currentStep: nextStep,
        status,
      },
    },
    { new: true }
  ).lean();
  return d ? transformData(d) : null;
};

const reject = async (id: string): Promise<ExpenseEntity | null> => {
  const d = await ExpenseModel.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).lean();
  return d ? transformData(d) : null;
};

export const ExpenseDao = { create, findById, listByOwner, listPending, listAll, submit, recordApproval, reject };
