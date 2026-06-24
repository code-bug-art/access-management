// -------- Interfaces -------- //
import type { AuthzResponse, EvalContext, ResolvedGrant } from './interface';

const matchesPattern = (pattern: string, value: string): boolean => {
  if (pattern === '*' || pattern === value) return true;
  return pattern.endsWith(':*') && value.startsWith(pattern.slice(0, -1));
};

const scopeHolds = (grant: ResolvedGrant, ctx: EvalContext): boolean => {
  if (!grant.condition) return true;
  const { subject, resource } = ctx;
  switch (grant.condition.type) {
    case 'ownerOnly':
      return resource.ownerId === subject.id;
    case 'sameOrgUnit':
      return resource.orgUnitId === subject.orgUnitId;
    case 'inOrgSubtree':
      return resource.orgUnitId === subject.orgUnitId || (resource.orgUnitAncestors ?? []).includes(subject.orgUnitId);
    case 'isManagerOf':
      return (resource.ownerManagerChain ?? []).includes(subject.id);
  }
};

const amountWithinLimit = (grant: ResolvedGrant, amount: number | undefined): boolean => {
  if (grant.maxAmount === null) return true;
  return amount !== undefined && amount <= grant.maxAmount;
};

const describeScope = (condition: ResolvedGrant['condition']): string => {
  switch (condition?.type) {
    case 'isManagerOf':
      return "not in the approver's reporting line";
    case 'inOrgSubtree':
      return "outside the approver's org subtree";
    case 'sameOrgUnit':
      return 'different org unit';
    case 'ownerOnly':
      return 'not the owner';
    default:
      return 'out of scope';
  }
};

/**
 * Pure access decision. Order:
 *   1. tenant gate
 *   2. permission match (RBAC, inheritance already flattened into grants)
 *   3. separation of duties — block acting on own resource where denySelf is set
 *   4. scope condition (ABAC) + approval limit (approval matrix), most-permissive-wins
 * Fail-closed: anything not explicitly allowed is denied.
 */
const evaluateAccess = (ctx: EvalContext): AuthzResponse => {
  if (ctx.subject.tenantId !== ctx.resource.tenantId) {
    return { decision: 'DENY', reason: 'cross-tenant access denied' };
  }

  const candidates = ctx.grants.filter(
    (g) => matchesPattern(g.action, ctx.action) && matchesPattern(g.resourceType, ctx.resource.type)
  );
  if (candidates.length === 0) {
    return { decision: 'DENY', reason: `no permission grant for ${ctx.action}` };
  }

  if (ctx.resource.ownerId === ctx.subject.id && candidates.some((g) => g.denySelf)) {
    return { decision: 'DENY', reason: 'self-approval not allowed (separation of duties)' };
  }

  const passing = candidates.find((g) => scopeHolds(g, ctx) && amountWithinLimit(g, ctx.resource.amount));
  if (passing) {
    const bits: string[] = [];
    if (passing.condition) bits.push(passing.condition.type);
    if (passing.maxAmount != null) bits.push(`limit $${passing.maxAmount}`);
    const detail = bits.length ? ` (${bits.join(', ')})` : '';
    return {
      decision: 'ALLOW',
      reason: `granted by role "${passing.roleName}" via ${passing.action}${detail}`,
      matchedRole: passing.roleName,
    };
  }

  const scopeOk = candidates.filter((g) => scopeHolds(g, ctx));
  if (scopeOk.length > 0) {
    const limit = Math.max(...scopeOk.map((g) => g.maxAmount ?? 0));
    return { decision: 'DENY', reason: `exceeds approval limit of $${limit}` };
  }

  return { decision: 'DENY', reason: describeScope(candidates[0]!.condition) };
};

export { evaluateAccess };
