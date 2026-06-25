/** Gateway main-orchestrator — login Swagger fijo (misma URL que front-shared). */

export const ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
export const DEFAULT_AUTH_LOGIN_PATH = "/api/auth/test-token";

export function resolveOrchestratorBase(_apiBase?: string): string {
  return ORCHESTRATOR_URL_PROD;
}
