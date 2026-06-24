// -------- Domain Layer -------- //
import { ReportDao } from '../domain/report';
import type { ReportEntity } from '../domain/report/interface';

/** Dev-only: all reports (raw ids) for the demo UI's pickers. */
const getReportCatalog = (): Promise<ReportEntity[]> => ReportDao.listAll();

export { getReportCatalog };
