// -------- Packages -------- //
import type { FastifyInstance } from 'fastify';
// -------- Application -------- //
import { login } from '../../../application/authentication/login';
// -------- Middleware -------- //
import { authenticate } from '../middleware';

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/auth/login', async (req, reply) => {
    const { tenantSlug, email, password } = req.body as { tenantSlug: string; email: string; password: string };
    const result = await login(tenantSlug, email, password);
    if (!result) return reply.code(401).send({ error: 'invalid credentials' });
    return result;
  });

  app.get('/auth/me', { preHandler: authenticate }, async (req) => ({ claims: req.claims }));
};
