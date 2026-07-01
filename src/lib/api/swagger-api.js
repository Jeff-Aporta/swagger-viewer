/** Rutas del visor IS-Swagger inferidas desde la base `/api` del host. */

export const OPENAPI_CONFIG_KIND = "insoft.openapi-config";

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

export function inferSwaggerUrls(apiBase) {
  const base = normalizeApiBase(apiBase);
  if (!base) return { apiBase: "", get: "", put: "", config: "" };
  const root = base.replace(/\/$/, "");
  return {
    apiBase: root,
    get: `${root}/swagger.json`,
    put: `${root}/swagger.json`,
    config: `${root}/system/swagger/config.json`,
  };
}

export const DEFAULT_PAYLOAD_PATHS = {
  // Config unificada (meta + paths + config) — endpoint atómico del ISS.
  config: "/system/swagger/config.json",
  meta: "/system/swagger/meta.json",
  paths: "/system/swagger/paths.json",
  docsConfig: "/system/swagger/docs-config.json",
  testing: "/system/testing.json",
};

function payloadPath(base, segment) {
  const s = String(segment ?? "").trim();
  if (!s) return "";
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

/** Rutas GET usadas al conectar el visor (config + meta + paths + testing). */
export function inferSwaggerPayloadUrls(apiBase, connPaths) {
  const root = normalizeApiBase(apiBase).replace(/\/$/, "");
  if (!root) {
    return { apiBase: "", config: "", meta: "", paths: "", docsConfig: "", testing: "" };
  }
  const p = { ...DEFAULT_PAYLOAD_PATHS, ...(connPaths && typeof connPaths === "object" ? connPaths : {}) };
  return {
    apiBase: root,
    config: payloadPath(root, p.config),
    meta: payloadPath(root, p.meta),
    paths: payloadPath(root, p.paths),
    docsConfig: payloadPath(root, p.docsConfig),
    testing: payloadPath(root, p.testing),
  };
}

async function fetchJsonOptional(url) {
  if (!url) return { ok: false, error: "URL vacía", data: null, status: 0 };
  let res;
  try {
    res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (e) {
    return { ok: false, error: `No se pudo conectar con ${url}: ${e?.message || e}`, data: null, status: 0 };
  }
  if (!res.ok) {
    return { ok: false, error: `GET ${url} → ${res.status} ${res.statusText || ""}`.trim(), data: null, status: res.status };
  }
  try {
    const data = await readJsonResponse(res, url);
    return { ok: true, data, error: null, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message || String(e), data: null, status: res.status };
  }
}

/** Descarga paralela de todos los JSON de carga IS-Swagger desde la API conectada. */
export async function fetchRemoteSwaggerPayloads(apiBase, connPaths) {
  const urls = inferSwaggerPayloadUrls(apiBase, connPaths);
  if (!urls.config) throw new Error("Base API inválida");
  const [configR, metaR, pathsR, testingR] = await Promise.all([
    fetchJsonOptional(urls.config),
    fetchJsonOptional(urls.meta),
    fetchJsonOptional(urls.paths),
    fetchJsonOptional(urls.testing),
  ]);
  if (!configR.ok && !metaR.ok) {
    throw new Error(configR.error || metaR.error || "No se pudo cargar config ni meta desde la API");
  }
  return {
    urls,
    config: configR.data,
    meta: metaR.data,
    paths: pathsR.data,
    testing: testingR.data,
    errors: {
      config: configR.ok ? null : configR.error,
      meta: metaR.ok ? null : metaR.error,
      paths: pathsR.ok ? null : pathsR.error,
      testing: testingR.ok ? null : testingR.error,
    },
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
export async function fetchRemoteOpenApiConfig(apiBase) {
  const urls = inferSwaggerUrls(apiBase);
  if (!urls.config) throw new Error("Base API inválida");
  let res;
  try {
    res = await fetch(urls.config, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error(`No se pudo conectar con ${urls.config}: ${e?.message || e}`);
  }
  if (!res.ok) throw new Error(`GET ${urls.config} → ${res.status} ${res.statusText || ""}`.trim());
  const doc = await readJsonResponse(res, urls.config);
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) throw new Error("Config vacía o con formato inesperado");
  if (doc.kind && doc.kind !== OPENAPI_CONFIG_KIND) {
    throw new Error(`Config con kind «${doc.kind}»; se espera «${OPENAPI_CONFIG_KIND}».`);
  }
  return { doc, urls };
}

/** PUT insoft.openapi-config — requiere JWT (swagger_editors). */
export async function putRemoteOpenApiConfig(apiBase, config, jwt) {
  const token = String(jwt || "").trim().replace(/^bearer\s+/i, "");
  if (!token) throw new Error("Inicie sesión para guardar la config IS en BD (PUT /swagger.json).");
  const urls = inferSwaggerUrls(apiBase);
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
