// -------- Packages -------- //
import type { AuthzRequest, AuthzResponse } from '@contracts';
// -------- Infrastructure -------- //
import { pdpClient } from '../../infrastructure/access_client';

/** Ask the access-management service (the PDP) for a decision. */
export const checkAccess = (request: AuthzRequest): Promise<AuthzResponse> => pdpClient.checkAccess(request);
