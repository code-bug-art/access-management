// -------- Packages -------- //
import Fastify from 'fastify';
import cors from '@fastify/cors';
// -------- Infrastructure -------- //
import { connectDb } from './infrastructure/connection';
import { config } from './infrastructure/config';
// -------- Interface -------- //
import { expenseRoutes } from './interface/http/routes';

await connectDb();
const app = Fastify({ logger: false });
await app.register(cors, { origin: true });
await app.register(expenseRoutes);
await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`[expense-service] listening on :${config.port}`);
