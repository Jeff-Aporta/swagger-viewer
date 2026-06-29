/** Pestaña Probar / Ejemplos / Doc por operación — persiste en ?s=.tabs (vía swagger-url-state). */

import { getSwaggerExpandUrlState } from "./swagger-url-state.js";

export const OP_TAB_DEFAULT = "try";
export const OP_TAB_IDS = ["try", "overview", "doc"];

export function readOpTabFromUrl(expandId) {
  const api = getSwaggerExpandUrlState();
  if (!api || !expandId) return OP_TAB_DEFAULT;
  return api.getOpTab(expandId);
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
