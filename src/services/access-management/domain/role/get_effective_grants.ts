// -------- Data Layer -------- //
import { RoleDao } from './role_dml';
// -------- Domain -------- //
import { resolveEffectiveGrants } from '../authorization';
import type { CompiledRole, ResolvedGrant } from '../authorization/interface';

interface CompiledTenant {
  version: number;
  rolesById: Map<string, CompiledRole>;
}

// In-memory compiled-policy cache, keyed by tenant. Reloads only when policyVersion changes.
const cache = new Map<string, CompiledTenant>();

const compileRoles = async (tenantId: string): Promise<Map<string, CompiledRole>> => {
  const roles = await RoleDao.listByTenant(tenantId);
  const rolesById = new Map<string, CompiledRole>();
  for (const role of roles) {
    rolesById.set(role.id, {
      name: role.name,
      parentRoleId: role.parentRoleId,
      grants: role.grants.map((g) => ({ ...g, roleName: role.name })),
    });
  }
  return rolesById;
};

/**
 * Effective grants for a subject, with role inheritance flattened. Cached per (tenantId, policyVersion);
 * the caller supplies the current policyVersion (owned by the tenant aggregate) as the invalidation key.
 */
const getEffectiveGrants = async (
  tenantId: string,
  policyVersion: number,
  roleIds: string[]
): Promise<ResolvedGrant[]> => {
  const cached = cache.get(tenantId);
  const rolesById = cached && cached.version === policyVersion ? cached.rolesById : await compileRoles(tenantId);
  if (!cached || cached.version !== policyVersion) cache.set(tenantId, { version: policyVersion, rolesById });
  return resolveEffectiveGrants(rolesById, roleIds);
};

export { getEffectiveGrants };
