/** Pestaña secundaria (viewer.nav) persistente en ?nav=. */

export const NAV_URL_PARAM = "nav";

export function readNavTabFromUrl(searchParams) {
  try {
    const sp = searchParams || (typeof location !== "undefined" ? new URLSearchParams(location.search) : null);
    return String(sp?.get?.(NAV_URL_PARAM) || "").trim();
  } catch {
    return "";
  }
}

export function writeNavTabToUrl(tabId, { replace = true } = {}) {
  if (typeof location === "undefined") return;
  try {
    const url = new URL(location.href);
    const id = String(tabId || "").trim();
    if (id) url.searchParams.set(NAV_URL_PARAM, id);
    else url.searchParams.delete(NAV_URL_PARAM);
    if (replace) history.replaceState(history.state, "", url);
    else history.pushState(history.state, "", url);
  } catch {
    /* ignore */
  }
}
