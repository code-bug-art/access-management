// -------- Interfaces -------- //
import type { CompiledRole, ResolvedGrant } from './interface';

/**
 * Effective grants for a set of role ids: each role's own grants plus all ancestor-role grants
 * (single-parent chain), flattened. Cycles are guarded against. Pure — no I/O.
 */
const resolveEffectiveGrants = (rolesById: Map<string, CompiledRole>, roleIds: string[]): ResolvedGrant[] => {
  const out: ResolvedGrant[] = [];
  const seen = new Set<string>();

  const walk = (roleId: string): void => {
    if (seen.has(roleId)) return;
    seen.add(roleId);
    const role = rolesById.get(roleId);
    if (!role) return;
    out.push(...role.grants);
    if (role.parentRoleId) walk(role.parentRoleId);
  };

  for (const id of roleIds) walk(id);
  return out;
};

export { resolveEffectiveGrants };
