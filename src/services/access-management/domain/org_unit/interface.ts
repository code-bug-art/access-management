// ==================== ENTITY ====================

type OrgUnitType = 'company' | 'division' | 'department' | 'team';

interface OrgUnitEntity {
  id: string;
  tenantId: string;
  name: string;
  type: OrgUnitType;
  parentId: string | null;
  ancestors: string[]; // materialized path, root-first
  headUserId: string | null; // the user who heads this unit
}

export type { OrgUnitEntity, OrgUnitType };
