/** Base URL para Try it out (OpenAPI servers + auth.loginUrl). */



import { resolveServerUrl } from "../openapi/openapi.js";

import { encodeIssFilterB64, LOOKUP_SEARCH_LIMIT } from "../filter/iss-list-filter.js";



export function normalizeServerBase(raw) {

  return String(raw || "")

    .trim()

    .replace(/\/+$/, "");

}



export function inferDefaultServerBase(spec, config = {}) {
  const apiBase = normalizeServerBase(config?.apiBase);
  if (apiBase) return apiBase;

  const raw = resolveServerUrl(spec);
  const origin = normalizeServerBase(typeof location !== "undefined" ? location.origin : "");

  if (!raw) return origin;

  if (/^https?:\/\//i.test(raw)) return normalizeServerBase(raw);

  const host = origin;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return normalizeServerBase(`${host}${path}`);
}



export function joinApiUrl(serverBase, apiPath) {

  const base = normalizeServerBase(serverBase);

  if (!base) return apiPath;

  const path = String(apiPath || "").startsWith("/") ? apiPath : `/${apiPath}`;

  return `${base}${path}`;

}



export function resolveLookupRequestUrl(lookup, serverBase, query = "") {

  if (!lookup) return "";

  if (lookup.url) {

    const url = String(lookup.url);

    if (url.startsWith("/") && serverBase) return joinApiUrl(serverBase, url).replace("{q}", encodeURIComponent(query || ""));

    return url.replace("{q}", encodeURIComponent(query || ""));

  }

  if (lookup.listPath && serverBase) {

    const limit = lookup.searchLimit ?? LOOKUP_SEARCH_LIMIT;

    const q = String(query ?? "").trim();

    const preset = lookup.listFilter && typeof lookup.listFilter === "object" ? lookup.listFilter : {};
    const filtroObj = { ...preset, ...(q ? { search: q } : {}), limit, offset: 0 };
    if (preset.eq && typeof preset.eq === "object") filtroObj.eq = { ...preset.eq };
    const filtroJson = JSON.stringify(filtroObj);
    const path = String(lookup.listPath);
    const qs = lookup.resource === "conversaciones" || path.includes("conversaciones")
      ? `f=${encodeURIComponent(encodeIssFilterB64(filtroJson))}`
      : `search=${encodeURIComponent(query || "")}&limit=${limit}`;

    return `${joinApiUrl(serverBase, path)}?${qs}`;

  }

  return "";

}

export function buildDistinctLookupUrl(serverBase, listPath, { columns, search, searchField, limit = LOOKUP_SEARCH_LIMIT, sort = "-count" } = {}) {
  if (!listPath || !serverBase || !columns?.length) return "";
  const f = { distinct: [...columns], limit, offset: 0, sort };
  const q = String(search ?? "").trim();
  if (q) {
    f.search = q;
    if (searchField) f.searchColumn = searchField;
  }
  const qs = `f=${encodeURIComponent(encodeIssFilterB64(JSON.stringify(f)))}`;
  return `${joinApiUrl(serverBase, listPath)}?${qs}`;
}


