/** Base del gateway main-orchestrator — auth siempre vía MO, no el host de la API documentada. */

export const ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
export const ORCHESTRATOR_URL_LOCAL = "http://localhost:8790";

export function resolveOrchestratorBase(apiBase) {
  const raw = String(apiBase || "").trim();
  if (raw) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw.replace(/\/api\/?$/i, "") : `http://${raw}`);
      const h = u.hostname;
      if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return ORCHESTRATOR_URL_LOCAL;
    } catch {
      /* ignore */
    }
  }
  if (typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname)) {
    return ORCHESTRATOR_URL_LOCAL;
  }
  return ORCHESTRATOR_URL_PROD;
}

export function resolveAuthConfig(auth = {}, apiBase) {
  const path = String(auth.loginPath || "/api/auth/test-token");
  return {
    ...auth,
    enabled: auth.enabled !== false,
    loginKind: auth.loginKind || "portal",
    loginPath: path.includes("portal-login") ? "/api/auth/test-token" : path,
    loginUrl: resolveOrchestratorBase(apiBase || auth.loginUrl),
  };
}
