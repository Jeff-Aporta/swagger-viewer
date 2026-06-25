/** Auth fijo vía main-orchestrator (misma URL que el resto de apps InSoft). */

import { MAIN_ORCHESTRATOR_URL_PROD } from "../../../../front-shared/cdn/isa/js/core/config/constants.js";

export { MAIN_ORCHESTRATOR_URL_PROD as ORCHESTRATOR_URL_PROD };

/** Siempre el gateway de producción — no depende del host de la API ni de localhost. */
export function resolveOrchestratorBase(_apiBase) {
  return MAIN_ORCHESTRATOR_URL_PROD;
}

export function resolveAuthConfig(auth = {}, _apiBase) {
  const path = String(auth.loginPath || "/api/auth/test-token");
  return {
    ...auth,
    enabled: auth.enabled !== false,
    loginKind: auth.loginKind || "portal",
    loginPath: path.includes("portal-login") ? "/api/auth/test-token" : path,
    loginUrl: MAIN_ORCHESTRATOR_URL_PROD,
  };
}
