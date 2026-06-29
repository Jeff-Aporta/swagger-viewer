/** Param ?conn= — JSON en base64url para autoconexión embed (ISS → demo GH Pages).
 *
 * Campos habituales:
 *   apiBase  — …/api (obligatorio para autoconnect)
 *   auto     — conectar al cargar (default true)
 *   embed    — modo iframe
 *   paths    — override rutas swagger relativas a apiBase (opcional):
 *     config, swaggerJson, meta, paths, doc, health
 *   Si paths se omite, defaults ISS: /system/swagger/config.json, /system/swagger.json, …
 */

import { normalizeApiBase, DEFAULT_SWAGGER_PATHS } from "./swagger-api.js";

export const GH_PAGES_SWAGGER_DEMO = "https://jeff-aporta.github.io/swagger-viewer/index.html";

function padB64(s) {
  let out = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4) out += "=";
  return out;
}

export function parseConnParam(raw) {
  if (!raw?.trim()) return null;
  try {
    const bin = atob(padB64(raw.trim()));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/** ?conn= o ?s= (b64url JSON); prioriza conn. */
export function parseEmbedParams(searchParams) {
  const connRaw = searchParams?.get?.("conn");
  const sRaw = searchParams?.get?.("s");
  return parseConnParam(connRaw) || parseConnParam(sRaw);
}

/** Marca temprana desde conn (?title/?name + ?icon o brand.*). */
export function resolveConnBrand(conn) {
  if (!conn || typeof conn !== "object") return null;
  const title = String(conn.title || conn.name || conn.appName || conn.brand?.title || "").trim();
  const icon = String(conn.icon || conn.brand?.icon || "").trim();
  if (!title && !icon) return null;
  return { title: title || undefined, icon: icon || undefined };
}

export function encodeConnParam(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Payload ?conn= (apiBase + paths sistema + marca). */
export function buildConnPayload(apiBase, extra = {}) {
  const base = normalizeApiBase(apiBase);
  if (!base) return null;
  const brand = resolveConnBrand(extra) || (extra.brand ? resolveConnBrand({ brand: extra.brand }) : null);
  const conn = {
    apiBase: base,
    auto: extra.auto !== false,
    embed: extra.embed === true,
    paths: { ...DEFAULT_SWAGGER_PATHS, ...(extra.paths && typeof extra.paths === "object" ? extra.paths : {}) },
  };
  if (extra.fixedServer) conn.fixedServer = true;
  if (brand?.title) conn.title = brand.title;
  if (brand?.icon) conn.icon = brand.icon;
  return conn;
}

/** URL GH Pages con ?conn= para abrir el visor conectado a la API actual. */
export function buildGhPagesSwaggerUrl(apiBase, extra = {}) {
  const conn = buildConnPayload(apiBase, { auto: true, embed: false, ...extra });
  if (!conn) return "";
  const u = new URL(extra.viewerUrl || GH_PAGES_SWAGGER_DEMO);
  u.searchParams.set("conn", encodeConnParam(conn));
  const s = extra.s ?? extra.uiState;
  if (s) u.searchParams.set("s", String(s).trim());
  const nav = extra.nav ?? (typeof location !== "undefined" ? new URLSearchParams(location.search).get("nav") : "");
  if (nav) u.searchParams.set("nav", String(nav).trim());
  return u.href;
}

/** Query de una URL incluyendo el `?`. */
export function queryFromUrl(href) {
  const i = String(href || "").indexOf("?");
  return i >= 0 ? href.slice(i) : "";
}
