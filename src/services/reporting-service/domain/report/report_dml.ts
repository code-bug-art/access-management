// -------- Data Layer -------- //
import { ReportModel } from './report.schema';
// -------- Interfaces -------- //
import type { ReportEntity } from './interface';

const transformData = (d: any): ReportEntity => ({
  id: String(d._id),
  tenantId: String(d.tenantId),
  ownerId: String(d.ownerId),
  orgUnitId: String(d.orgUnitId),
  title: d.title,
});

const findById = async (id: string): Promise<ReportEntity | null> => {
  const d = await ReportModel.findById(id).lean();
  return d ? transformData(d) : null;
};

const listAll = async (): Promise<ReportEntity[]> => {
  return (await ReportModel.find().lean()).map(transformData);
};

export const ReportDao = { findById, listAll };
