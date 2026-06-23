/** Rutas OpenAPI inferidas desde la base `/api` del host. */

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
  if (!base) return { apiBase: "", get: "", put: "", config: "", is: "", postman: "" };
  const root = base.replace(/\/$/, "");
  return {
    apiBase: root,
    get: `${root}/swagger.json`,
    put: `${root}/swagger.json`,
    config: `${root}/swagger/config.json`,
    is: `${root}/swagger/is.json`,
    postman: `${root}/swagger/postman.json`,
  };
}

export async function fetchRemoteIsDocument(apiBase) {
  const urls = inferSwaggerUrls(apiBase);
  if (!urls.is) throw new Error("Base API inválida");
  const res = await fetch(urls.is, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${urls.is} → ${res.status}`);
  const doc = await res.json();
  if (!doc || typeof doc !== "object") throw new Error("Respuesta IS vacía");
  return { doc, urls };
}

/** GET público — insoft.openapi-config (fuente BD; par PUT). */
export async function fetchRemoteOpenApiConfig(apiBase) {
  const urls = inferSwaggerUrls(apiBase);
  if (!urls.config) throw new Error("Base API inválida");
  const res = await fetch(urls.config, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${urls.config} → ${res.status}`);
  const doc = await res.json();
  if (!doc || typeof doc !== "object") throw new Error("Config vacía");
  return { doc, urls };
}

/** PUT insoft.openapi-config — requiere JWT (swagger_editors). */
export async function putRemoteOpenApiConfig(apiBase, config, jwt) {
  const token = String(jwt || "").trim().replace(/^bearer\s+/i, "");
  if (!token) throw new Error("Inicie sesión para publicar (PUT /swagger.json).");
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
