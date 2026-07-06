/** Pestaña Probar / Ejemplos / Doc por operación — persiste en ?s=.tabs (vía swagger-url-state). */

import { getSwaggerExpandUrlState } from "./swagger-url-state.js";

export const OP_TAB_DEFAULT = "try";
export const OP_TAB_IDS = ["try", "overview", "doc"];

/** Devuelve el id de pestaña persistido para esta operación, con fallback a OP_TAB_DEFAULT
 * si no hay valor guardado o si el valor guardado está vacío / fuera del set permitido. */
export function readOpTabFromUrl(expandId) {
  const api = getSwaggerExpandUrlState();
  if (!api || !expandId) return OP_TAB_DEFAULT;
  const raw = api.getOpTab(expandId);
  const id = String(raw ?? "").trim();
  return OP_TAB_IDS.includes(id) ? id : OP_TAB_DEFAULT;
}

export function writeOpTabToUrl(expandId, tabId) {
  const api = getSwaggerExpandUrlState();
  if (!api || !expandId) return;
  api.setOpTab(expandId, tabId);
}

export function subscribeOpTabUrl(onChange) {
  const api = getSwaggerExpandUrlState();
  if (!api) return () => {};
  return api.subscribe(onChange);
}
