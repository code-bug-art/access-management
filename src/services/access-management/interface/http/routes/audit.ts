// -------- Packages -------- //
import type { FastifyInstance } from 'fastify';
// -------- Application -------- //
import { getAuditTrail } from '../../../application/audit/get_audit_trail';
// -------- Middleware -------- //
import { authenticate, requirePermission } from '../middleware';

/** Audit feed. Guarded by audit:read (held by TenantAdmin and Auditor). */
export const auditRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requirePermission('audit:read', 'audit'));

  app.get('/audit', async (req) => {
    const { decision, userId } = req.query as { decision?: string; userId?: string };
    return getAuditTrail(req.claims!.tenantId, { decision, subjectId: userId });
  });
};
