/** Gateway main-orchestrator — login Swagger fijo (misma URL que front-shared). */

export const ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
export const DEFAULT_AUTH_LOGIN_PATH = "/api/auth/token";

export function resolveOrchestratorBase(_apiBase?: string): string {
  return ORCHESTRATOR_URL_PROD;
}

const AUTH_APP_ALIASES: Record<string, string> = { "swagger-viewer": "isa-patyia", "swagger-viewer-demo": "isa-patyia", ISS: "isa-patyia" };

export function resolveAuthAppId(app?: string): string {
  const raw = String(app ?? "").trim();
  return AUTH_APP_ALIASES[raw] || raw || "isa-patyia";
}
