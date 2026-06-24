// ==================== ENTITY ====================

/**
 * A job title / position. `approvalLimit` is the amount this designation may approve
 * (null = unlimited); `level` orders the org chart (lower = more senior).
 */
interface DesignationEntity {
  key: string;
  tenantId: string;
  title: string;
  level: number;
  approvalLimit: number | null;
}

export type { DesignationEntity };
