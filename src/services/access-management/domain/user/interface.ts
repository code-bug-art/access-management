// ==================== ENTITY ====================

interface UserEntity {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  orgUnitId: string;
  designationKey: string | null; // job title / position (drives approval authority)
  managerId: string | null; // reporting line
  roleIds: string[];
  status: 'active' | 'disabled';
  passwordHash: string;
}

export type { UserEntity };
