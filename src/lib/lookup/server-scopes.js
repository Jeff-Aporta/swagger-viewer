/** Scopes de servidor API (viewer.scopes en documento IS / openapi-config). */

import { normalizeServerBase } from "./server-base.js";
import { DEFAULT_API_SCOPES } from "../api/api-presets.js";

export const CUSTOM_SCOPE_ID = "__custom__";

export function normalizeScopeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const base = normalizeServerBase(raw.base || raw.url || raw.apiBase);
  const id = String(raw.id || "").trim();
  const label = String(raw.label || raw.name || id || base).trim();
  if (!base) return null;
  return { id: id || base, label, base, icon: raw.icon || "mdi:web" };
}

export function normalizeScopes(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const s = normalizeScopeEntry(item);
    if (!s || seen.has(s.base)) continue;
    seen.add(s.base);
    out.push(s);
  }
  return out;
}

export function scopesFromConfig(config = {}) {
  return normalizeScopes(config.scopes);
}

export function matchScope(scopes, serverBase) {
  const base = normalizeServerBase(serverBase);
  if (!base) return null;
  return scopes.find((s) => normalizeServerBase(s.base) === base) || null;
}

export function resolveScopePresetId(scopes, serverBase) {
  return matchScope(scopes, serverBase)?.id || CUSTOM_SCOPE_ID;
}

/** Presets demo IS-Swagger cuando el JSON aún no define scopes. */
export const DEMO_API_SCOPES = DEFAULT_API_SCOPES;
