import type { FastifyReply } from "fastify";
import type { AuthzRequest, AuthzResponse } from "@contracts";
import type { PdpClient } from "./pdp-client";

/**
 * Enforce an access decision at a PEP. Asks the PDP; on DENY it sends a 403 and returns null.
 * On ALLOW it returns the decision so the caller can proceed (and surface the reason).
 */
export async function enforce(
  pdp: PdpClient,
  reply: FastifyReply,
  request: AuthzRequest,
): Promise<AuthzResponse | null> {
  const decision = await pdp.checkAccess(request);
  if (decision.decision === "DENY") {
    await reply.code(403).send(decision);
    return null;
  }
  return decision;
}
