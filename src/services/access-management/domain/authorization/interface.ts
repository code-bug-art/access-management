// -------- Packages -------- //
import type { AuthzResponse } from '@contracts';

// ==================== ABAC CONDITIONS ====================

/**
 * Scope condition attached to an RBAC grant.
 * - ownerOnly:    subject owns the resource (self-service)
 * - sameOrgUnit:  resource is in the subject's exact org unit
 * - inOrgSubtree: resource's org unit is the subject's unit or below it
 * - isManagerOf:  subject is above the resource owner in the reporting line
 */
type ConditionType = 'ownerOnly' | 'sameOrgUnit' | 'inOrgSubtree' | 'isManagerOf';

interface Condition {
  type: ConditionType;
}

// ==================== GRANTS ====================

interface Grant {
  action: string; // e.g. "expense:read", "admin:*"
  resourceType: string; // e.g. "expense", "admin", "*"
  condition: Condition | null;
  maxAmount: number | null; // approval matrix; null = unlimited
  denySelf: boolean; // separation of duties
}

/** A grant carrying the role it came from, for audit/explainability. */
interface ResolvedGrant extends Grant {
  roleName: string;
}

// ==================== EVALUATION ====================

interface EvalContext {
  subject: { id: string; tenantId: string; orgUnitId: string };
  action: string;
  resource: {
    type: string;
    id: string;
    tenantId: string;
    ownerId?: string;
    orgUnitId?: string;
    amount?: number;
    orgUnitAncestors?: string[]; // resource org-unit ancestors (root-first)
    ownerManagerChain?: string[]; // reporting-line ancestors of the resource owner
  };
  grants: ResolvedGrant[]; // role inheritance already flattened
}

/** A compiled role used when flattening the role hierarchy. */
interface CompiledRole {
  name: string;
  parentRoleId: string | null;
  grants: ResolvedGrant[];
}

export type { ConditionType, Condition, Grant, ResolvedGrant, EvalContext, CompiledRole, AuthzResponse };
