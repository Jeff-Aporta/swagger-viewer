/** Gateway main-orchestrator — login Swagger siempre por MO, no por el host de la API. */

export const ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
export const ORCHESTRATOR_URL_LOCAL = "http://localhost:8790";

export const DEFAULT_AUTH_LOGIN_PATH = "/api/auth/test-token";

export function resolveOrchestratorBase(apiBase?: string): string {
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
  return ORCHESTRATOR_URL_PROD;
}
