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

/**
 * Consume una respuesta text/event-stream leyendo el body chunk a chunk.
 * - Llama onChunk(fullText, { done }) cada vez que se reciben nuevos bytes.
 * - Devuelve { res, ok } sin concatenar todo (se va acumulando fuera).
 * - Lanza con formatHttpError si la conexión falla antes del primer byte.
 */
export async function fetchSseStream(url, opts = {}, onChunk) {
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
  const reader = res.body?.getReader?.();
  const decoder = new TextDecoder("utf-8");
  let full = "";
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const piece = decoder.decode(value, { stream: true });
      full += piece;
      onChunk?.(full, { done: false, chunk: piece });
    }
    full += decoder.decode();
    onChunk?.(full, { done: true });
  } else {
    full = await res.text();
    onChunk?.(full, { done: true });
  }
  return { res, ok: res.ok, text: full };
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
