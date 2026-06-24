import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import type { TokenClaims } from "@contracts";

declare module "fastify" {
  interface FastifyRequest {
    claims?: TokenClaims;
  }
}

/**
 * Builds a Fastify preHandler that validates the Bearer JWT and attaches claims (incl. tenant context).
 * POC uses a shared symmetric secret; a real PEP would validate against the IdP's JWKS.
 */
export function createAuthenticate(jwtSecret: string) {
  return async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      await reply.code(401).send({ error: "missing bearer token" });
      return;
    }
    try {
      req.claims = jwt.verify(token, jwtSecret) as TokenClaims;
    } catch {
      await reply.code(401).send({ error: "invalid or expired token" });
    }
  };
}
