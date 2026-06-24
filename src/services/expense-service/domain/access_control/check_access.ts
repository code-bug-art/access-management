// -------- Packages -------- //
import type { AuthzRequest, AuthzResponse } from '@contracts';
// -------- Infrastructure -------- //
import { pdpClient } from '../../infrastructure/access_client';

/**
 * Ask the access-management service (the PDP) for a decision. This is the only place this service
 * talks to the access platform — the rest of the code treats authorization as an external capability.
 */
export const checkAccess = (request: AuthzRequest): Promise<AuthzResponse> => pdpClient.checkAccess(request);
