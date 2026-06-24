// -------- Data Layer -------- //
import { DesignationModel } from './designation.schema';
// -------- Interfaces -------- //
import type { DesignationEntity } from './interface';

const transformData = (d: any): DesignationEntity => ({
  key: d.key,
  tenantId: String(d.tenantId),
  title: d.title,
  level: d.level,
  approvalLimit: d.approvalLimit ?? null,
});

const findByKey = async (tenantId: string, key: string): Promise<DesignationEntity | null> => {
  const d = await DesignationModel.findOne({ tenantId, key }).lean();
  return d ? transformData(d) : null;
};

const listByTenant = async (tenantId: string): Promise<DesignationEntity[]> => {
  return (await DesignationModel.find({ tenantId }).sort({ level: 1 }).lean()).map(transformData);
};

const listAll = async (): Promise<DesignationEntity[]> => {
  return (await DesignationModel.find().lean()).map(transformData);
};

export const DesignationDao = { findByKey, listByTenant, listAll };
