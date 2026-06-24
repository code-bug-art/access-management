// ==================== ENTITY ====================

interface PayrollRecordEntity {
  id: string;
  tenantId: string;
  ownerId: string;
  orgUnitId: string;
  grossPay: number;
}

export type { PayrollRecordEntity };
