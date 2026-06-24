// ==================== ENTITY ====================

type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/** A snapshot of one approval level on a submitted expense. */
interface ChainStep {
  order: number;
  name: string;
  roleId: string;
  roleName: string;
  state: 'pending' | 'approved';
  approverId: string | null;
}

interface ExpenseEntity {
  id: string;
  tenantId: string;
  ownerId: string;
  orgUnitId: string;
  amount: number;
  status: ExpenseStatus;
  chain: ChainStep[];
  currentStep: number;
}

interface CreateExpenseData {
  tenantId: string;
  ownerId: string;
  orgUnitId: string;
  amount: number;
}

export type { ExpenseEntity, ExpenseStatus, ChainStep, CreateExpenseData };
