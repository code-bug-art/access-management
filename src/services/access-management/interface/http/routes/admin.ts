// -------- Packages -------- //
import type { FastifyInstance } from 'fastify';
// -------- Application -------- //
import * as RoleAdmin from '../../../application/role_administration/manage_roles';
import type { Grant } from '../../../domain/role/interface';
// -------- Middleware -------- //
import { authenticate, requirePermission } from '../middleware';

/** Policy Administration Point (PAP). Guarded by admin:write. */
export const adminRoutes = async (app: FastifyInstance): Promise<void> => {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requirePermission('admin:write', 'admin'));

  app.get('/admin/roles', async (req) => RoleAdmin.listRoles(req.claims!.tenantId));

  app.post('/admin/roles', async (req, reply) => {
    const { name, parentRoleId, grants } = req.body as { name: string; parentRoleId?: string; grants?: Grant[] };
    const role = await RoleAdmin.createRole(req.claims!.tenantId, { name, parentRoleId, grants });
    return reply.code(201).send(role);
  });

  app.post('/admin/roles/:roleId/grants', async (req, reply) => {
    const { roleId } = req.params as { roleId: string };
    const role = await RoleAdmin.addGrantToRole(req.claims!.tenantId, roleId, req.body as Grant);
    if (!role) return reply.code(404).send({ error: 'role not found' });
    return role;
  });

  app.get('/admin/users', async (req) => RoleAdmin.listUsers(req.claims!.tenantId));

  app.post('/admin/users/:userId/roles', async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { roleId } = req.body as { roleId: string };
    const roleIds = await RoleAdmin.assignRole(req.claims!.tenantId, userId, roleId);
    if (!roleIds) return reply.code(404).send({ error: 'user not found' });
    return { ok: true, roleIds };
  });

  app.delete('/admin/users/:userId/roles/:roleId', async (req, reply) => {
    const { userId, roleId } = req.params as { userId: string; roleId: string };
    const roleIds = await RoleAdmin.revokeRole(req.claims!.tenantId, userId, roleId);
    if (!roleIds) return reply.code(404).send({ error: 'user not found' });
    return { ok: true, roleIds };
  });
};
