// -------- Interfaces -------- //
import type { Grant } from '../authorization/interface';

// ==================== ENTITY ====================

interface RoleEntity {
  id: string;
  tenantId: string;
  name: string;
  parentRoleId: string | null;
  grants: Grant[];
}

// ==================== DML DATA TYPES ====================

interface CreateRoleData {
  name: string;
  parentRoleId?: string | null;
  grants?: Grant[];
}

export type { RoleEntity, CreateRoleData, Grant };
