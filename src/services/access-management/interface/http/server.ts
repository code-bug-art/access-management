// -------- Packages -------- //
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
// -------- Routes -------- //
import { authRoutes } from './routes/auth';
import { authzRoutes } from './routes/authz';
import { adminRoutes } from './routes/admin';
import { auditRoutes } from './routes/audit';
import { directoryRoutes } from './routes/directory';

/** Build the core HTTP app. Each route module is registered as an encapsulated plugin. */
export const buildServer = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });

  await app.register(authRoutes);
  await app.register(authzRoutes);
  await app.register(adminRoutes);
  await app.register(auditRoutes);
  await app.register(directoryRoutes);

  app.get('/healthz', async () => ({ ok: true, service: 'access-management' }));
  return app;
};
