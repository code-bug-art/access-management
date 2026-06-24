// -------- Infrastructure -------- //
import { connectDb } from './infrastructure/connection';
import { config } from './infrastructure/config';
// -------- Interface -------- //
import { buildServer } from './interface/http/server';

await connectDb();
const app = await buildServer();
await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`[access-management] listening on :${config.port}`);
