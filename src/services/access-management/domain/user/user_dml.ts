// -------- Data Layer -------- //
import { UserModel } from './user.schema';
// -------- Interfaces -------- //
import type { UserEntity } from './interface';

const transformData = (d: any): UserEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  email: d.email,
  displayName: d.displayName,
  orgUnitId: String(d.orgUnitId),
  designationKey: d.designationKey ?? null,
  managerId: d.managerId ? String(d.managerId) : null,
  roleIds: (d.roleIds ?? []).map(String),
  status: d.status,
  passwordHash: d.passwordHash,
});

const transformNullable = (d: any | null): UserEntity | null => (d ? transformData(d) : null);

const findById = async (userId: string): Promise<UserEntity | null> => {
  return transformNullable(await UserModel.findById(userId).lean());
};

const findByTenantAndEmail = async (tenantId: string, email: string): Promise<UserEntity | null> => {
  return transformNullable(await UserModel.findOne({ tenantId, email, status: 'active' }).lean());
};

const listByTenant = async (tenantId: string): Promise<UserEntity[]> => {
  return (await UserModel.find({ tenantId }).lean()).map(transformData);
};

const listAll = async (): Promise<UserEntity[]> => {
  return (await UserModel.find().lean()).map(transformData);
};

const assignRole = async (tenantId: string, userId: string, roleId: string): Promise<UserEntity | null> => {
  return transformNullable(
    await UserModel.findOneAndUpdate({ _id: userId, tenantId }, { $addToSet: { roleIds: roleId } }, { new: true }).lean()
  );
};

const revokeRole = async (tenantId: string, userId: string, roleId: string): Promise<UserEntity | null> => {
  return transformNullable(
    await UserModel.findOneAndUpdate({ _id: userId, tenantId }, { $pull: { roleIds: roleId } }, { new: true }).lean()
  );
};

/** Walk the reporting line up from a user, returning ancestor manager ids (manager-first). */
const getManagerChain = async (userId: string): Promise<string[]> => {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: any = await UserModel.findById(userId).select('managerId').lean();
  while (current?.managerId && !seen.has(String(current.managerId))) {
    const mgrId = String(current.managerId);
    seen.add(mgrId);
    chain.push(mgrId);
    current = await UserModel.findById(mgrId).select('managerId').lean();
  }
  return chain;
};

export const UserDao = {
  findById,
  findByTenantAndEmail,
  listByTenant,
  listAll,
  assignRole,
  revokeRole,
  getManagerChain,
};
