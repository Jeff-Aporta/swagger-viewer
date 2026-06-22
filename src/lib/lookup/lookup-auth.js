/** Si los autocompletes ISS pueden consultar la API (sin abrir modal de login). */

import { getStoredJwt } from "../auth/auth.js";

/** true cuando no hay auth global o ya hay JWT — entonces sí se hace fetch al listado. */
export function canRunIssLookup(authEnabled) {
  return !authEnabled || !!getStoredJwt()?.token;
}
