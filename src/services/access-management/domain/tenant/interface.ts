// ==================== ENTITY ====================

interface TenantEntity {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  policyVersion: number;
}

export type { TenantEntity };
