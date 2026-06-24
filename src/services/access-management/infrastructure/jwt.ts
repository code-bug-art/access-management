// -------- Packages -------- //
import jwt from 'jsonwebtoken';
// -------- Config -------- //
import { config } from './config';
// -------- Interfaces -------- //
import type { TokenClaims } from '@contracts';

const TOKEN_EXPIRY = '1h';

export const signToken = (claims: TokenClaims): string => {
  return jwt.sign(claims, config.jwtSecret, { expiresIn: TOKEN_EXPIRY });
};

/** Returns claims if valid, or null if the token is missing/invalid/expired. */
export const verifyToken = (token: string): TokenClaims | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenClaims;
  } catch {
    return null;
  }
};
