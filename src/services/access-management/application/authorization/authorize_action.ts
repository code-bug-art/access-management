// -------- Packages -------- //
import type { AuthzResponse } from '@contracts';
// -------- Domain Layer -------- //
import { UserDao } from '../../domain/user';
import { TenantDao } from '../../domain/tenant';
import { getEffectiveGrants } from '../../domain/role';
import { evaluateAccess } from '../../domain/authorization';

/**
 * Checks whether a user's own grants permit an action (no resource owner / no audit).
 * Used to guard the service's own admin and audit endpoints.
 */
const authorizeAction = async (userId: string, action: string, resourceType: string): Promise<AuthzResponse> => {
  const user = await UserDao.findById(userId);
  if (!user) return { decision: 'DENY', reason: 'unknown user' };

  const tenant = await TenantDao.findById(user.tenantId);
  const grants = await getEffectiveGrants(user.tenantId, tenant?.policyVersion ?? 0, user.roleIds);
  return evaluateAccess({
    subject: { id: user.id, tenantId: user.tenantId, orgUnitId: user.orgUnitId },
    action,
    resource: { type: resourceType, id: resourceType, tenantId: user.tenantId },
    grants,
  });
};

export { authorizeAction };
