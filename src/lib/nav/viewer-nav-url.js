/** Pestaña secundaria del visor en ?s=.tab (ISAFront createUrlState / bg4url). */

export const LEGACY_NAV_PARAM = "nav";

/** Solo migración: ?nav= quedó reemplazado por ?s=.tab */
export function readLegacyNavParam(search) {
  const raw = search ?? (typeof location !== "undefined" ? location.search : "");
  return String(new URLSearchParams(raw).get(LEGACY_NAV_PARAM) ?? "").trim();
}

export function stripLegacyNavParam() {
  if (typeof location === "undefined") return;
  const url = new URL(location.href);
  if (!url.searchParams.has(LEGACY_NAV_PARAM)) return;
  url.searchParams.delete(LEGACY_NAV_PARAM);
  history.replaceState(history.state, "", url);
}

export function resolveInitialNavTab(getUrlStateTab) {
  return String(getUrlStateTab?.() ?? "").trim();
}
