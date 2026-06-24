// -------- Data Layer -------- //
import { OrgUnitModel } from './org_unit.schema';
// -------- Interfaces -------- //
import type { OrgUnitEntity } from './interface';

const transformData = (d: any): OrgUnitEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  name: d.name,
  type: d.type,
  parentId: d.parentId ? String(d.parentId) : null,
  ancestors: (d.ancestors ?? []).map(String),
  headUserId: d.headUserId ? String(d.headUserId) : null,
});

const findById = async (orgUnitId: string): Promise<OrgUnitEntity | null> => {
  const d = await OrgUnitModel.findById(orgUnitId).lean();
  return d ? transformData(d) : null;
};

const listAll = async (): Promise<OrgUnitEntity[]> => {
  return (await OrgUnitModel.find().lean()).map(transformData);
};

export const OrgUnitDao = { findById, listAll };
