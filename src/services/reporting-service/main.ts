// -------- Packages -------- //
import Fastify from 'fastify';
import cors from '@fastify/cors';
// -------- Infrastructure -------- //
import { connectDb } from './infrastructure/connection';
import { config } from './infrastructure/config';
// -------- Interface -------- //
import { reportingRoutes } from './interface/http/routes';

await connectDb();
const app = Fastify({ logger: false });
await app.register(cors, { origin: true });
await app.register(reportingRoutes);
await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`[reporting-service] listening on :${config.port}`);
