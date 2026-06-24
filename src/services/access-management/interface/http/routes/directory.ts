// -------- Packages -------- //
import type { FastifyInstance } from 'fastify';
// -------- Application -------- //
import { getDirectory } from '../../../application/directory/get_directory';

export const directoryRoutes = async (app: FastifyInstance): Promise<void> => {
  // Identity directory for the demo UI's user/role pickers (read-only, POC convenience).
  app.get('/directory', async () => getDirectory());
};
