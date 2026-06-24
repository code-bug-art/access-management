// -------- Packages -------- //
import type { AuthzResponse } from '@contracts';

/**
 * Role-based approval primitive. The expense service owns the workflow (steps + thresholds) and
 * passes the current step's required role; access-management decides whether this subject may sign it.
 */
interface ApprovalContext {
  subject: { id: string; tenantId: string; roleIds: string[] };
  resource: { tenantId: string; ownerId?: string; requiredRoleId?: string };
  requiredRoleName: string;
}

export type { ApprovalContext, AuthzResponse };
