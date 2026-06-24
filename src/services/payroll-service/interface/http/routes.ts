// -------- Packages -------- //
import type { FastifyInstance, FastifyReply } from 'fastify';
// -------- Application -------- //
import { readPayroll } from '../../application/read_payroll';
import { getPayrollCatalog } from '../../application/get_payroll_catalog';
import type { Outcome } from '../../application/outcome';
// -------- Middleware -------- //
import { authenticate } from './middleware';

const send = (reply: FastifyReply, outcome: Outcome<unknown>) => {
  if (outcome.kind === 'not_found') return reply.code(404).send({ error: 'not found' });
  if (outcome.kind === 'denied') return reply.code(403).send(outcome.decision);
  return reply.send(outcome.data);
};

export const payrollRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/payroll/:id', { preHandler: authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await readPayroll(req.claims!, id));
  });

  app.get('/catalog', async () => getPayrollCatalog());

  app.get('/healthz', async () => ({ ok: true, service: 'payroll-service' }));
};
