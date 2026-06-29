/** Parámetros Try it out (path/query/body) por operación — persiste en ?s=.params. */

import { getSwaggerExpandUrlState } from "./swagger-url-state.js";

export function readOpParamFromUrl(expandId, paramName) {
  const api = getSwaggerExpandUrlState();
  if (!api || !expandId || !paramName) return "";
  const map = api.getOpParams(expandId);
  return map?.[paramName] || "";
}

export function writeOpParamToUrl(expandId, paramName, value) {
  const api = getSwaggerExpandUrlState();
  if (!api || !expandId || !paramName) return;
  api.setOpParam(expandId, paramName, value);
}

export function subscribeOpParamsUrl(onChange) {
  const api = getSwaggerExpandUrlState();
  if (!api) return () => {};
  return api.subscribe(onChange);
}
