/** JWT payload issued by the core service and validated by every PEP. */
export interface TokenClaims {
  sub: string; // user id
  tenantId: string;
  orgUnitId: string; // subject's org unit, for stamping resources at PEPs
  email: string;
  roleVersion: number; // tenant.policyVersion at issue time (informational)
}
