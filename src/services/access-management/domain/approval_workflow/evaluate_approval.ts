// -------- Interfaces -------- //
import type { ApprovalContext, AuthzResponse } from './interface';

/**
 * Decide a single workflow step (pure). Order: tenant gate -> separation of duties ->
 * the subject must hold the role the current step requires.
 */
const evaluateApproval = (ctx: ApprovalContext): AuthzResponse => {
  const { subject, resource, requiredRoleName } = ctx;

  if (subject.tenantId !== resource.tenantId) {
    return { decision: 'DENY', reason: 'cross-tenant access denied' };
  }
  if (resource.ownerId && resource.ownerId === subject.id) {
    return { decision: 'DENY', reason: 'self-approval not allowed (separation of duties)' };
  }
  if (!resource.requiredRoleId) {
    return { decision: 'DENY', reason: 'no approval step configured' };
  }
  if (!subject.roleIds.includes(resource.requiredRoleId)) {
    return { decision: 'DENY', reason: `this step requires the "${requiredRoleName}" role` };
  }

  return {
    decision: 'ALLOW',
    reason: `approved by "${requiredRoleName}"`,
    matchedRole: requiredRoleName,
  };
};

export { evaluateApproval };
