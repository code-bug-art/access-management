// -------- Packages -------- //
import { createAuthenticate } from '@pep-sdk';
// -------- Config -------- //
import { config } from '../../infrastructure/config';

export const authenticate = createAuthenticate(config.jwtSecret);
