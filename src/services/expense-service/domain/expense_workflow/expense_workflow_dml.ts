// -------- Data Layer -------- //
import { ExpenseWorkflowModel } from './expense_workflow.schema';
// -------- Interfaces -------- //
import type { ExpenseWorkflowEntity, WorkflowStep } from './interface';

const transformData = (d: any): ExpenseWorkflowEntity => ({
  tenantId: String(d.tenantId),
  steps: (d.steps ?? []).map((s: any) => ({
    order: s.order,
    name: s.name,
    minAmount: s.minAmount ?? 0,
    roleId: String(s.roleId),
    roleName: s.roleName,
  })),
});

const get = async (tenantId: string): Promise<ExpenseWorkflowEntity> => {
  const d = await ExpenseWorkflowModel.findOne({ tenantId }).lean();
  return d ? transformData(d) : { tenantId, steps: [] };
};

const upsert = async (tenantId: string, steps: WorkflowStep[]): Promise<ExpenseWorkflowEntity> => {
  const d = await ExpenseWorkflowModel.findOneAndUpdate(
    { tenantId },
    { tenantId, steps },
    { upsert: true, new: true }
  ).lean();
  return transformData(d);
};

export const ExpenseWorkflowDao = { get, upsert };
