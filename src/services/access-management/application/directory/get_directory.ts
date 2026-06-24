// -------- Domain Layer -------- //
import { TenantDao } from '../../domain/tenant';
import { OrgUnitDao } from '../../domain/org_unit';
import { RoleDao } from '../../domain/role';
import { UserDao } from '../../domain/user';
import { DesignationDao } from '../../domain/designation';

/**
 * Identity directory the core owns: tenants, org units (typed), designations, roles, and enriched users.
 * Business-resource pickers are served by each business service's own /catalog; the UI joins by id.
 */
const getDirectory = async () => {
  const [tenants, orgUnits, roles, users, designations] = await Promise.all([
    TenantDao.listAll(),
    OrgUnitDao.listAll(),
    RoleDao.listAll(),
    UserDao.listAll(),
    DesignationDao.listAll(),
  ]);

  const tenantSlug = new Map(tenants.map((t) => [t.id, t.slug]));
  const orgName = new Map(orgUnits.map((o) => [o.id, o.name]));
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const userName = new Map(users.map((u) => [u.id, u.displayName]));
  const designationTitle = new Map(designations.map((d) => [`${d.tenantId}:${d.key}`, d.title]));

  return {
    tenants: tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    orgUnits: orgUnits.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      parentId: o.parentId,
      tenantSlug: tenantSlug.get(o.tenantId),
      headName: o.headUserId ? (userName.get(o.headUserId) ?? null) : null,
    })),
    roles: roles.map((r) => ({ id: r.id, name: r.name, tenantSlug: tenantSlug.get(r.tenantId) })),
    users: users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      tenantSlug: tenantSlug.get(u.tenantId),
      orgName: orgName.get(u.orgUnitId),
      designation: u.designationKey ? (designationTitle.get(`${u.tenantId}:${u.designationKey}`) ?? null) : null,
      managerName: u.managerId ? (userName.get(u.managerId) ?? null) : null,
      roleNames: u.roleIds.map((id) => roleName.get(id)).filter(Boolean),
    })),
  };
};

export { getDirectory };
