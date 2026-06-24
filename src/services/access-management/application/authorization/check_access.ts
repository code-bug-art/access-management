// -------- Packages -------- //
import type { AuthzRequest, AuthzResponse } from '@contracts';
// -------- Domain Layer -------- //
import { UserDao } from '../../domain/user';
import { TenantDao } from '../../domain/tenant';
import { OrgUnitDao } from '../../domain/org_unit';
import { RoleDao, getEffectiveGrants } from '../../domain/role';
import { evaluateAccess } from '../../domain/authorization';
import { evaluateApproval, isWorkflowAction } from '../../domain/approval_workflow';
import { AuditLogDao } from '../../domain/audit';

/**
 * The PDP use case. Approval actions are decided by the org hierarchy (reporting line + designation
 * limit); everything else by the role/permission policy. Either way the decision is audited.
 */
const checkAccess = async (req: AuthzRequest): Promise<AuthzResponse> => {
  const subject = await UserDao.findById(req.subject.id);
  if (!subject || subject.status !== 'active') {
    return { decision: 'DENY', reason: 'unknown or disabled subject' };
  }

  const result = isWorkflowAction(req.action)
    ? await decideApproval(subject, req)
    : await decideByPolicy(subject, req);

  await AuditLogDao.record({
    tenantId: subject.tenantId,
    subjectId: subject.id,
    action: req.action,
    resourceType: req.resource.type,
    resourceId: req.resource.id,
    decision: result.decision,
    reason: result.reason,
    matchedRole: result.matchedRole ?? null,
  });

  return result;
};

/**
 * Approval is a HYBRID decision — both gates must pass:
 *   1. Workflow step: the subject holds the role the current step requires, isn't the owner (SoD), same tenant.
 *   2. Base permission (RBAC): the subject's roles actually grant `expense:approve`.
 * Gate 2 stops the workflow from handing approval power to a role that lacks the base capability.
 */
const decideApproval = async (
  subject: NonNullable<Awaited<ReturnType<typeof UserDao.findById>>>,
  req: AuthzRequest
): Promise<AuthzResponse> => {
  const requiredRole = req.resource.requiredRoleId ? await RoleDao.findById(req.resource.requiredRoleId) : null;
  const requiredRoleName = requiredRole?.name ?? req.resource.requiredRoleId ?? 'required role';

  // Gate 1 — workflow step.
  const step = evaluateApproval({
    subject: { id: subject.id, tenantId: subject.tenantId, roleIds: subject.roleIds },
    resource: { tenantId: req.resource.tenantId, ownerId: req.resource.ownerId, requiredRoleId: req.resource.requiredRoleId },
    requiredRoleName,
  });
  if (step.decision === 'DENY') return step;

  // Gate 2 — base RBAC capability (the subject's roles must grant expense:approve).
  const tenant = await TenantDao.findById(subject.tenantId);
  const grants = await getEffectiveGrants(subject.tenantId, tenant?.policyVersion ?? 0, subject.roleIds);
  const base = evaluateAccess({
    subject: { id: subject.id, tenantId: subject.tenantId, orgUnitId: subject.orgUnitId },
    action: req.action,
    resource: { ...req.resource },
    grants,
  });
  if (base.decision === 'DENY') {
    return { decision: 'DENY', reason: `holds the "${requiredRoleName}" step role but lacks the expense:approve permission` };
  }

  return { decision: 'ALLOW', reason: `${step.reason} · with expense:approve permission`, matchedRole: step.matchedRole };
};

/** RBAC + ABAC for resource permissions (read / create / payroll / admin / audit). */
const decideByPolicy = async (
  subject: NonNullable<Awaited<ReturnType<typeof UserDao.findById>>>,
  req: AuthzRequest
): Promise<AuthzResponse> => {
  const tenant = await TenantDao.findById(subject.tenantId);
  const orgUnitAncestors = req.resource.orgUnitId
    ? ((await OrgUnitDao.findById(req.resource.orgUnitId))?.ancestors ?? [])
    : [];

  const grants = await getEffectiveGrants(subject.tenantId, tenant?.policyVersion ?? 0, subject.roleIds);
  return evaluateAccess({
    subject: { id: subject.id, tenantId: subject.tenantId, orgUnitId: subject.orgUnitId },
    action: req.action,
    resource: { ...req.resource, orgUnitAncestors },
    grants,
  });
};

export { checkAccess };
