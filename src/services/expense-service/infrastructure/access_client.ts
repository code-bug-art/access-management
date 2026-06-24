// -------- Packages -------- //
import { createPdpClient } from '@pep-sdk';
// -------- Config -------- //
import { config } from './config';

/** Singleton PDP client this service uses to reach the access-management decision endpoint. */
export const pdpClient = createPdpClient({ baseUrl: config.pdpUrl, serviceToken: config.serviceToken });
