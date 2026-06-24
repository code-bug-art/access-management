// -------- Packages -------- //
import type { AuthzResponse } from '@contracts';

/** Transport-agnostic result of a PEP use case. The HTTP layer maps it to a status code. */
export type Outcome<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'denied'; decision: AuthzResponse }
  | { kind: 'not_found' };
