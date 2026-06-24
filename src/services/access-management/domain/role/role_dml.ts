// -------- Data Layer -------- //
import { RoleModel } from './role.schema';
// -------- Interfaces -------- //
import type { CreateRoleData, Grant, RoleEntity } from './interface';

const transformGrant = (g: any): Grant => ({
  action: g.action,
  resourceType: g.resourceType,
  condition: g.condition ? { type: g.condition.type } : null,
  maxAmount: g.maxAmount ?? null,
  denySelf: g.denySelf ?? false,
});

const transformData = (d: any): RoleEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  name: d.name,
  parentRoleId: d.parentRoleId ? String(d.parentRoleId) : null,
  grants: (d.grants ?? []).map(transformGrant),
});

const findById = async (roleId: string): Promise<RoleEntity | null> => {
  const d = await RoleModel.findById(roleId).lean();
  return d ? transformData(d) : null;
};

const listByTenant = async (tenantId: string): Promise<RoleEntity[]> => {
  return (await RoleModel.find({ tenantId }).lean()).map(transformData);
};

const listAll = async (): Promise<RoleEntity[]> => {
  return (await RoleModel.find().lean()).map(transformData);
};

const create = async (tenantId: string, data: CreateRoleData): Promise<RoleEntity> => {
  const created = await RoleModel.create({
    tenantId,
    name: data.name,
    parentRoleId: data.parentRoleId ?? null,
    grants: data.grants ?? [],
  });
  return transformData(created.toObject());
};

const addGrant = async (tenantId: string, roleId: string, grant: Grant): Promise<RoleEntity | null> => {
  const d = await RoleModel.findOneAndUpdate({ _id: roleId, tenantId }, { $push: { grants: grant } }, { new: true }).lean();
  return d ? transformData(d) : null;
};

export const RoleDao = { findById, listByTenant, listAll, create, addGrant };
