// -------- Packages -------- //
import type { FastifyInstance, FastifyReply } from 'fastify';
// -------- Application -------- //
import { readReport } from '../../application/read_report';
import { getReportCatalog } from '../../application/get_report_catalog';
import type { Outcome } from '../../application/outcome';
// -------- Middleware -------- //
import { authenticate } from './middleware';

const send = (reply: FastifyReply, outcome: Outcome<unknown>) => {
  if (outcome.kind === 'not_found') return reply.code(404).send({ error: 'not found' });
  if (outcome.kind === 'denied') return reply.code(403).send(outcome.decision);
  return reply.send(outcome.data);
};

export const reportingRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/reports/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await readReport(req.claims!, id));
  });

  app.get('/catalog', async () => getReportCatalog());

  app.get('/healthz', async () => ({ ok: true, service: 'reporting-service' }));
};
