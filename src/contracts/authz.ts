/** The published authorization language shared between the core service and every PEP. */

export type Decision = "ALLOW" | "DENY";

/** A PEP's request for an access decision. The PEP supplies resource attributes (PIP-at-PEP). */
export interface AuthzRequest {
  subject: { id: string; tenantId: string };
  action: string;
  resource: {
    type: string;
    id: string;
    tenantId: string;
    ownerId?: string;
    orgUnitId?: string;
    amount?: number;
    /** For expense:approve — the access role required by the current workflow step. */
    requiredRoleId?: string;
  };
  context?: { serviceId?: string; ip?: string };
}

export interface AuthzResponse {
  decision: Decision;
  reason: string;
  matchedRole?: string;
}
