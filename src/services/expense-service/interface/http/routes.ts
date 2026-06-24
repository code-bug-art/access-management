// -------- Packages -------- //
import type { FastifyInstance, FastifyReply } from 'fastify';
// -------- Application -------- //
import { createExpense } from '../../application/create_expense';
import { getExpense } from '../../application/get_expense';
import { submitExpense } from '../../application/submit_expense';
import { approveExpense } from '../../application/approve_expense';
import { rejectExpense } from '../../application/reject_expense';
import { listMyExpenses } from '../../application/list_my_expenses';
import { listPendingApprovals } from '../../application/list_pending_approvals';
import { getExpenseCatalog } from '../../application/get_expense_catalog';
import { getWorkflow } from '../../application/workflow/get_workflow';
import { updateWorkflow } from '../../application/workflow/update_workflow';
import type { Outcome } from '../../application/outcome';
import type { WorkflowStep } from '../../domain/expense_workflow/interface';
// -------- Middleware -------- //
import { authenticate } from './middleware';

const send = (reply: FastifyReply, outcome: Outcome<unknown>, okCode = 200) => {
  if (outcome.kind === 'not_found') return reply.code(404).send({ error: 'not found' });
  if (outcome.kind === 'conflict') return reply.code(409).send({ error: outcome.message });
  if (outcome.kind === 'denied') return reply.code(403).send(outcome.decision);
  return reply.code(okCode).send(outcome.data);
};

export const expenseRoutes = async (app: FastifyInstance): Promise<void> => {
  const auth = { preHandler: authenticate };

  // ---- Workflow configuration ----
  app.get('/workflow', auth, async (req) => getWorkflow(req.claims!));
  app.put('/workflow', auth, async (req, reply) => {
    const { steps } = req.body as { steps: WorkflowStep[] };
    return send(reply, await updateWorkflow(req.claims!, steps));
  });

  // ---- Expense lifecycle ----
  app.post('/expenses', auth, async (req, reply) => {
    const { amount } = req.body as { amount: number };
    return send(reply, await createExpense(req.claims!, amount), 201);
  });
  app.get('/expenses/mine', auth, async (req) => listMyExpenses(req.claims!));
  app.get('/expenses/inbox', auth, async (req) => listPendingApprovals(req.claims!));
  app.get('/expenses/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await getExpense(req.claims!, id));
  });
  app.post('/expenses/:id/submit', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await submitExpense(req.claims!, id));
  });
  app.post('/expenses/:id/approve', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await approveExpense(req.claims!, id));
  });
  app.post('/expenses/:id/reject', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    return send(reply, await rejectExpense(req.claims!, id));
  });

  // Dev-only resource catalog for the demo UI's pickers.
  app.get('/catalog', async () => getExpenseCatalog());
  app.get('/healthz', async () => ({ ok: true, service: 'expense-service' }));
};
