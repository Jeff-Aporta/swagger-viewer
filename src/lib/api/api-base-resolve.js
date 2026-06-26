/** Resolución de base API: local primero en host local, fallback a staging web. */

import { normalizeApiBase } from "./swagger-api.js";
import { ISS_LOCAL_API_BASE, ISS_WEB_API_BASE } from "./api-presets.js";

export { ISS_LOCAL_API_BASE, ISS_WEB_API_BASE };

export function isLocalViewerHost() {
  if (typeof location === "undefined") return false;
  return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
}

export function isLocalApiBase(base) {
  const b = normalizeApiBase(base);
  if (!b) return false;
  try {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(new URL(b).hostname);
  } catch {
    return false;
  }
}

/** Bases a intentar en orden (sin duplicados). */
export function resolveConnectBases({ connApiBase = "", apiParam = "", storedBase = "" } = {}) {
  const conn = connApiBase ? normalizeApiBase(connApiBase) : "";
  const param = apiParam ? normalizeApiBase(apiParam) : "";
  const stored = storedBase ? normalizeApiBase(storedBase) : "";
  const explicit = conn || param || stored;
  const web = normalizeApiBase(ISS_WEB_API_BASE);
  const local = normalizeApiBase(ISS_LOCAL_API_BASE);

  const push = (list, base) => {
    const b = normalizeApiBase(base);
    if (b && !list.includes(b)) list.push(b);
    return list;
  };

  if (explicit && isLocalApiBase(explicit)) return push(push([], explicit), web);
  if (explicit) return push([], explicit);
  if (isLocalViewerHost()) return push(push([], local), web);
  return push([], web);
}

export async function connectWithFallback(fetchFn, bases) {
  const list = (bases || []).map((b) => normalizeApiBase(b)).filter(Boolean);
  if (!list.length) throw new Error("Sin base API configurada.");
  let lastErr;
  for (let i = 0; i < list.length; i++) {
    try {
      const result = await fetchFn(list[i]);
      return { ...result, base: list[i], usedFallback: i > 0 };
    } catch (e) {
      lastErr = e;
      if (i < list.length - 1) continue;
      throw e;
    }
  }
  throw lastErr || new Error("No se pudo conectar con la API.");
}
