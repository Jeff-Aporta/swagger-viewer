/** Rutas OpenAPI inferidas desde la base `/api` del host. */



export const OPENAPI_CONFIG_KIND = "insoft.openapi-config";



/** Paths relativos a `apiBase` (…/api). Override vía `conn.paths`. */

export const DEFAULT_SWAGGER_PATHS = {

  config: "/system/swagger/config.json",

  swaggerJson: "/system/swagger.json",

  meta: "/system/swagger/meta.json",

  paths: "/system/swagger/paths.json",

  doc: "/system/swagger/docs/{key}",

  health: "/system/health",

};

/** Rutas pre-/system/ (staging sin desplegar aún). Fallback en GET config. */
export const LEGACY_SWAGGER_PATHS = {
  config: "/swagger/config.json",
  swaggerJson: "/swagger.json",
  health: "/health",
};

const PATH_ALIASES = {

  config: ["config", "configPath", "swaggerConfig"],

  swaggerJson: ["swaggerJson", "put", "putPath", "swagger"],

  meta: ["meta", "metaPath"],

  paths: ["paths", "pathsPath", "pathsJson"],

  doc: ["doc", "docPath", "docs"],

  health: ["health", "healthPath"],

};



export function normalizeApiBase(input) {

  let s = String(input ?? "").trim();

  if (!s) return "";

  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;

  const u = new URL(s);

  let path = u.pathname.replace(/\/+$/, "");

  if (!path.endsWith("/api")) {

    path = path ? `${path}/api` : "/api";

  }

  u.pathname = path;

  u.search = "";

  u.hash = "";

  return `${u.origin}${u.pathname}`;

}



export function apiOrigin(apiBase) {

  const base = normalizeApiBase(apiBase);

  if (!base) return "";

  return new URL(base).origin;

}



/** Extrae overrides de paths desde `conn` (?conn= b64 JSON). Acepta `conn.paths` o claves planas. */

export function resolveConnPaths(conn) {

  if (!conn || typeof conn !== "object") return {};

  const src = conn.paths && typeof conn.paths === "object" ? { ...conn.paths, ...conn } : conn;

  const out = {};

  for (const [key, aliases] of Object.entries(PATH_ALIASES)) {

    for (const a of aliases) {

      const v = src[a];

      if (v != null && String(v).trim()) {

        out[key] = String(v).trim();

        break;

      }

    }

  }

  return out;

}



function joinSwaggerPath(apiBase, path) {

  const p = String(path || "").trim();

  if (!p) return "";

  if (/^https?:\/\//i.test(p)) return p;

  const base = normalizeApiBase(apiBase);

  if (p.startsWith("/api/")) return `${new URL(base).origin}${p}`;

  const rel = p.startsWith("/") ? p : `/${p}`;

  return `${base.replace(/\/$/, "")}${rel}`;

}



/** Resuelve URLs absolutas de endpoints swagger + paths relativos efectivos. */

export function inferSwaggerUrls(apiBase, pathOverrides = null) {

  const root = normalizeApiBase(apiBase);

  if (!root) {

    return { apiBase: "", get: "", put: "", config: "", meta: "", paths: "", doc: "", health: "", pathRel: { ...DEFAULT_SWAGGER_PATHS } };

  }

  const merged = { ...DEFAULT_SWAGGER_PATHS, ...resolveConnPaths(pathOverrides) };

  const swaggerJson = joinSwaggerPath(root, merged.swaggerJson);

  return {

    apiBase: root,

    get: swaggerJson,

    put: swaggerJson,

    config: joinSwaggerPath(root, merged.config),

    meta: joinSwaggerPath(root, merged.meta),

    paths: joinSwaggerPath(root, merged.paths),

    doc: joinSwaggerPath(root, merged.doc),

    health: joinSwaggerPath(root, merged.health),

    pathRel: merged,

  };

}



async function readJsonResponse(res, url) {

  const text = await res.text();

  if (!text.trim()) throw new Error(`GET ${url} → respuesta vacía (${res.status})`);

  try {

    return JSON.parse(text);

  } catch {

    const preview = text.slice(0, 120).replace(/\s+/g, " ");

    throw new Error(`GET ${url} → JSON inválido (${res.status}): ${preview}`);

  }

}



/** GET público — insoft.openapi-config (fuente BD; par PUT). */

export async function fetchRemoteOpenApiConfig(apiBase, pathOverrides = null) {

  const urls = inferSwaggerUrls(apiBase, pathOverrides);

  if (!urls.config) throw new Error("Base API inválida");

  const configCandidates = [urls.config];

  const legacyConfig = joinSwaggerPath(urls.apiBase, LEGACY_SWAGGER_PATHS.config);

  if (legacyConfig !== urls.config) configCandidates.push(legacyConfig);

  let res;

  let configUrl = urls.config;

  try {

    for (let i = 0; i < configCandidates.length; i++) {

      configUrl = configCandidates[i];

      res = await fetch(configUrl, { cache: "no-store", headers: { Accept: "application/json" } });

      if (res.ok || i === configCandidates.length - 1) break;

      if (res.status === 404) continue;

      break;

    }

  } catch (e) {

    throw new Error(`No se pudo conectar con ${configUrl}: ${e?.message || e}`);

  }

  if (!res.ok) throw new Error(`GET ${configUrl} → ${res.status} ${res.statusText || ""}`.trim());

  const doc = await readJsonResponse(res, configUrl);

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) throw new Error("Config vacía o con formato inesperado");

  if (doc.kind && doc.kind !== OPENAPI_CONFIG_KIND) {

    throw new Error(`Config con kind «${doc.kind}»; se espera «${OPENAPI_CONFIG_KIND}».`);

  }

  return { doc, urls };

}



/** PUT insoft.openapi-config — requiere JWT (swagger_editors). */

export async function putRemoteOpenApiConfig(apiBase, config, jwt, pathOverrides = null) {

  const token = String(jwt || "").trim().replace(/^bearer\s+/i, "");

  if (!token) throw new Error("Inicie sesión para guardar la config IS en BD (PUT /system/swagger.json).");

  const urls = inferSwaggerUrls(apiBase, pathOverrides);

  const res = await fetch(urls.put, {

    method: "PUT",

    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },

    body: JSON.stringify(config),

  });

  let data = {};

  try {

    data = await res.json();

  } catch {

    /* ignore */

  }

  if (!res.ok) {

    const detail = data?.encabezado?.mensaje || data?.error || data?.message || res.statusText;

    throw new Error(`PUT ${urls.put} → ${res.status}${detail ? `: ${detail}` : ""}`);

  }

  return data;

}


