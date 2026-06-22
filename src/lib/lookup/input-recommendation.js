/** Recomendaciones de input (endpoint + filtro f) — extensión x-iss-input-recommendation. */
import { encodeIssFilterB64 } from "../filter/iss-list-filter.js";
import { joinApiUrl } from "./server-base.js";

export const ISS_INPUT_RECOMMENDATION_EXT = "x-iss-input-recommendation";

export function recommendationListFilter(rec) {
  if (!rec || typeof rec !== "object") return null;
  return rec.listFilter && typeof rec.listFilter === "object" ? rec.listFilter : null;
}

export function recommendationUsesF(rec, listPath = rec?.listPath) {
  const path = String(listPath || "");
  return !!recommendationListFilter(rec) && (path.includes("conversaciones") || rec.resource === "conversaciones");
}

export function recommendationFilterB64(rec) {
  const f = recommendationListFilter(rec);
  if (!f) return "";
  try {
    return encodeIssFilterB64(JSON.stringify(f));
  } catch {
    return "";
  }
}

export function recommendationSampleRequest(rec, serverBase) {
  if (!rec?.listPath) return null;
  const method = String(rec.method || "GET").toUpperCase();
  const path = String(rec.listPath);
  const url = serverBase ? joinApiUrl(serverBase, path) : path;
  const fB64 = recommendationUsesF(rec, path) ? recommendationFilterB64(rec) : "";
  const qs = fB64 ? `?f=${encodeURIComponent(fB64)}` : "";
  return { method, path, url: `${url}${qs}`, f: recommendationListFilter(rec), fB64 };
}

export function schemaInputRecommendations(schema) {
  const props = schema?.properties;
  if (!props || typeof props !== "object") return [];
  return Object.entries(props)
    .map(([name, prop]) => ({ name, rec: prop?.[ISS_INPUT_RECOMMENDATION_EXT] }))
    .filter((item) => item.rec && typeof item.rec === "object");
}
