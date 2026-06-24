// ==================== ENTITY ====================

/** One level of the approval chain: applies when amount >= minAmount; signed by a holder of roleId. */
interface WorkflowStep {
  order: number;
  name: string;
  minAmount: number;
  roleId: string;
  roleName: string; // denormalized from access-management for display
}

interface ExpenseWorkflowEntity {
  tenantId: string;
  steps: WorkflowStep[];
}

export type { WorkflowStep, ExpenseWorkflowEntity };
