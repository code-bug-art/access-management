// -------- Packages -------- //
import type { FastifyReply, FastifyRequest } from 'fastify';
// -------- Interfaces -------- //
import type { TokenClaims } from '@contracts';
// -------- Infrastructure -------- //
import { verifyToken } from '../../infrastructure/jwt';
import { config } from '../../infrastructure/config';
// -------- Application -------- //
import { authorizeAction } from '../../application/authorization/authorize_action';

declare module 'fastify' {
  interface FastifyRequest {
    claims?: TokenClaims;
  }
}

/** Validate the Bearer JWT and attach claims. */
export const authenticate = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const claims = token ? verifyToken(token) : null;
  if (!claims) {
    await reply.code(401).send({ error: 'missing or invalid token' });
    return;
  }
  req.claims = claims;
};

/** Guard a route by the caller's own permission (e.g. admin:write, audit:read). */
export const requirePermission = (action: string, resourceType: string) => {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const decision = await authorizeAction(req.claims!.sub, action, resourceType);
    if (decision.decision !== 'ALLOW') {
      await reply.code(403).send({ error: `${action} required`, reason: decision.reason });
    }
  };
};

/** Validate the shared service token on the PDP decision endpoint (service-to-service). */
export const requireServiceToken = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (req.headers['x-service-token'] !== config.serviceToken) {
    await reply.code(401).send({ error: 'invalid service token' });
  }
};
