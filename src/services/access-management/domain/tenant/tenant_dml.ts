// -------- Data Layer -------- //
import { TenantModel } from './tenant.schema';
// -------- Interfaces -------- //
import type { TenantEntity } from './interface';

const transformData = (d: any): TenantEntity => ({
  id: String(d._id),
  name: d.name,
  slug: d.slug,
  status: d.status,
  policyVersion: d.policyVersion,
});

const transformNullable = (d: any | null): TenantEntity | null => (d ? transformData(d) : null);

const findById = async (tenantId: string): Promise<TenantEntity | null> => {
  return transformNullable(await TenantModel.findById(tenantId).lean());
};

const findBySlug = async (slug: string): Promise<TenantEntity | null> => {
  return transformNullable(await TenantModel.findOne({ slug, status: 'active' }).lean());
};

const incrementPolicyVersion = async (tenantId: string): Promise<void> => {
  await TenantModel.updateOne({ _id: tenantId }, { $inc: { policyVersion: 1 } });
};

const listAll = async (): Promise<TenantEntity[]> => {
  return (await TenantModel.find().lean()).map(transformData);
};

export const TenantDao = { findById, findBySlug, incrementPolicyVersion, listAll };
