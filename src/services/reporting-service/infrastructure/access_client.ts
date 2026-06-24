// -------- Packages -------- //
import { createPdpClient } from '@pep-sdk';
// -------- Config -------- //
import { config } from './config';

export const pdpClient = createPdpClient({ baseUrl: config.pdpUrl, serviceToken: config.serviceToken });
