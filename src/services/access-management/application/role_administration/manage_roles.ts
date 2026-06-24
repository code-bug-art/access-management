// -------- Domain Layer -------- //
import { RoleDao } from '../../domain/role';
import { UserDao } from '../../domain/user';
import { TenantDao } from '../../domain/tenant';
import type { CreateRoleData, Grant, RoleEntity } from '../../domain/role/interface';
import type { UserEntity } from '../../domain/user/interface';

/**
 * Policy Administration Point (PAP) use cases. Every mutation bumps the tenant's policyVersion so the
 * compiled-policy cache reloads on the next decision (changes take effect immediately).
 */

const listRoles = (tenantId: string): Promise<RoleEntity[]> => RoleDao.listByTenant(tenantId);
const listUsers = (tenantId: string): Promise<UserEntity[]> => UserDao.listByTenant(tenantId);

const createRole = async (tenantId: string, data: CreateRoleData): Promise<RoleEntity> => {
  const role = await RoleDao.create(tenantId, data);
  await TenantDao.incrementPolicyVersion(tenantId);
  return role;
};

const addGrantToRole = async (tenantId: string, roleId: string, grant: Grant): Promise<RoleEntity | null> => {
  const role = await RoleDao.addGrant(tenantId, roleId, grant);
  if (role) await TenantDao.incrementPolicyVersion(tenantId);
  return role;
};

const assignRole = async (tenantId: string, userId: string, roleId: string): Promise<string[] | null> => {
  const user = await UserDao.assignRole(tenantId, userId, roleId);
  if (!user) return null;
  await TenantDao.incrementPolicyVersion(tenantId);
  return user.roleIds;
};

const revokeRole = async (tenantId: string, userId: string, roleId: string): Promise<string[] | null> => {
  const user = await UserDao.revokeRole(tenantId, userId, roleId);
  if (!user) return null;
  await TenantDao.incrementPolicyVersion(tenantId);
  return user.roleIds;
};

export { listRoles, listUsers, createRole, addGrantToRole, assignRole, revokeRole };
