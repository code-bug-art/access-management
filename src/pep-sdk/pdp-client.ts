import type { AuthzRequest, AuthzResponse } from "@contracts";

export interface PdpClient {
  checkAccess(input: AuthzRequest): Promise<AuthzResponse>;
}

/**
 * Builds a client a PEP uses to ask the core access-management service for a decision.
 * Fails closed: any network/PDP error resolves to DENY.
 */
export function createPdpClient(opts: { baseUrl: string; serviceToken: string }): PdpClient {
  return {
    async checkAccess(input) {
      try {
        const res = await fetch(`${opts.baseUrl}/authz/check`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-service-token": opts.serviceToken },
          body: JSON.stringify(input),
        });
        if (!res.ok) return { decision: "DENY", reason: `pdp error ${res.status}` };
        return (await res.json()) as AuthzResponse;
      } catch {
        return { decision: "DENY", reason: "pdp unreachable (fail-closed)" };
      }
    },
  };
}
