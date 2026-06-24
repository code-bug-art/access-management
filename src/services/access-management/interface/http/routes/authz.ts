// -------- Packages -------- //
import type { FastifyInstance } from 'fastify';
import type { AuthzRequest } from '@contracts';
// -------- Application -------- //
import { checkAccess } from '../../../application/authorization/check_access';
// -------- Middleware -------- //
import { requireServiceToken } from '../middleware';

export const authzRoutes = async (app: FastifyInstance): Promise<void> => {
  // The PDP decision endpoint — called by PEPs over service-to-service auth.
  app.post('/authz/check', { preHandler: requireServiceToken }, async (req) => {
    return checkAccess(req.body as AuthzRequest);
  });
};
