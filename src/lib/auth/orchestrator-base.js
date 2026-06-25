/** Auth fijo vía main-orchestrator (misma URL que el resto de apps InSoft). */

import { MAIN_ORCHESTRATOR_URL_PROD } from "../../../../front-shared/cdn/isa/js/core/config/constants.js";

export { MAIN_ORCHESTRATOR_URL_PROD as ORCHESTRATOR_URL_PROD };

export const DEFAULT_AUTH_LOGIN_PATH = "/api/auth/token";

/** App JWT para login MO — swagger-viewer documenta APIs PatyIA (isa-patyia). */
const AUTH_APP_ALIASES = { "swagger-viewer": "isa-patyia", "swagger-viewer-demo": "isa-patyia", ISS: "isa-patyia" };

/** Siempre el gateway de producción — no depende del host de la API ni de localhost. */
export function resolveOrchestratorBase(_apiBase) {
  return MAIN_ORCHESTRATOR_URL_PROD;
}

export function resolveAuthAppId(config = {}) {
  const raw = String(config.auth?.app || config.app || "").trim();
  return AUTH_APP_ALIASES[raw] || raw || "isa-patyia";
}

export function resolveAuthConfig(auth = {}, _apiBase, config = {}) {
  const path = String(auth.loginPath || DEFAULT_AUTH_LOGIN_PATH);
  const appId = resolveAuthAppId({ ...config, auth, app: auth.app || config.app });
  return {
    ...auth,
    enabled: auth.enabled !== false,
    loginKind: auth.loginKind || "portal",
    loginPath: path.includes("portal-login") || path.includes("test-token") ? DEFAULT_AUTH_LOGIN_PATH : path,
    loginUrl: MAIN_ORCHESTRATOR_URL_PROD,
    app: appId,
  };
}
