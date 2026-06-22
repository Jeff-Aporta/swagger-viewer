/** fetch JSON contra la API con JWT y mensajes de error legibles. */

import { getStoredJwt } from "../auth/auth.js";
import { formatHttpError, extractApiError } from "./http-error.js";

export function authHeaders(includeAuth = true) {
  const headers = { Accept: "application/json" };
  if (!includeAuth) return headers;
  const jwt = getStoredJwt()?.token;
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  return headers;
}

export async function fetchApiRaw(url, opts = {}) {
  const headers = { ...authHeaders(opts.auth !== false), ...(opts.headers || {}) };
  let res;
  try {
    res = await fetch(url, { method: opts.method || "GET", ...opts, headers });
  } catch (e) {
    throw new Error(
      formatHttpError(0, {
        detail: e.message || String(e),
        endpoint: url,
        defaultHint: "Comprueba que la API esté en ejecución y que la URL del servidor sea correcta.",
      }),
    );
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { data, res, text, ok: res.ok };
}

export async function fetchApiJson(url, opts = {}) {
  const out = await fetchApiRaw(url, opts);
  if (!out.ok) {
    throw new Error(
      formatHttpError(out.res.status, {
        statusText: out.res.statusText,
        data: typeof out.data === "object" ? out.data : undefined,
        detail: typeof out.data === "string" ? out.data : undefined,
        endpoint: url,
        hint: opts.errorHint,
      }),
    );
  }
  return out;
}

export function extractEnvelopeError(data) {
  if (!data || typeof data !== "object") return "";
  const enc = data.encabezado;
  if (enc && enc.resultado === false) {
    return extractApiError(data) || "La API respondió con error.";
  }
  return "";
}
