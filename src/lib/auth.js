/** Sesión JWT para Try it out (system-login). */

import { formatLoginError } from "./http-error.js";
import {
  stripContapymeEmail,
  formatSessionDisplayName,
  formatSessionChipLabel,
  normalizeContapymeLoginId,
} from "../../../front-shared/cdn/isa/js/core/format.js";

export { stripContapymeEmail, formatSessionDisplayName, formatSessionChipLabel };

/** Etiqueta visible del chip de sesión — primer nombre, sin mayúsculas sostenidas. */
export function formatSessionUsername(value) {
  return formatSessionChipLabel(value, "JWT");
}

const STORAGE_KEY = "jeffaporta:swagger-test-jwt";
const CREDENTIALS_KEY = "jeffaporta:swagger-login-creds";
const PREFIX = "abc123";
const SUFFIX = "xyz987";

function caesarShiftForDate(d) {
  return d.getUTCDate();
}

function caesarEncode(text, shift) {
  return text
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift) % 26) + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      return c;
    })
    .join("");
}

export function wrapPassword(plain) {
  if (!plain) return plain;
  return caesarEncode(PREFIX + plain + SUFFIX, caesarShiftForDate(new Date()));
}

function encodeStoredSecret(plain) {
  if (!plain) return "";
  try {
    return btoa(unescape(encodeURIComponent(PREFIX + plain + SUFFIX)));
  } catch {
    return "";
  }
}

function decodeStoredSecret(enc) {
  if (!enc) return "";
  try {
    const raw = decodeURIComponent(escape(atob(enc)));
    if (raw.indexOf(PREFIX) === 0 && raw.slice(-SUFFIX.length) === SUFFIX) {
      return raw.slice(PREFIX.length, raw.length - SUFFIX.length);
    }
    return "";
  } catch {
    return "";
  }
}

export function readCredentials() {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return { username: "", password: "", remember: true };
    const saved = JSON.parse(raw);
    return {
      username: saved.username || "",
      password: saved.passwordEnc ? decodeStoredSecret(saved.passwordEnc) : "",
      remember: saved.remember !== false,
    };
  } catch {
    return { username: "", password: "", remember: true };
  }
}

export function saveCredentials(username, password, remember) {
  try {
    if (!remember) {
      localStorage.removeItem(CREDENTIALS_KEY);
      return;
    }
    localStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({
        remember: true,
        username,
        passwordEnc: encodeStoredSecret(password),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function getStoredJwt() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved.token) return null;
    if (saved.expiresAt && new Date(saved.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function storeJwt(token, meta = {}) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, ...meta }));
  } catch {
    /* ignore */
  }
}

export function clearJwt() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizeJwt(raw) {
  let t = (raw || "").trim();
  if (/^bearer\s+/i.test(t)) t = t.replace(/^bearer\s+/i, "");
  return t;
}

function isPortalLogin(opts = {}) {
  const path = String(opts.loginPath || "");
  return opts.loginKind === "portal" || path.includes("portal-login");
}

/** Portal: mismo origen por defecto; authBase (loginUrl) si el visor está en otro host. */
function resolveLoginEndpoint(authBase, loginPath, loginKind) {
  const portal = isPortalLogin({ loginKind, loginPath });
  const path = loginPath || (portal ? "/api/auth/portal-login" : "/api/auth/test-token");
  const base = (authBase || location.origin).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchTestJwt(authBase, username, password, opts = {}) {
  const portal = isPortalLogin(opts);
  const loginPath = opts.loginPath || (portal ? "/api/auth/portal-login" : "/api/auth/test-token");
  const endpoint = resolveLoginEndpoint(authBase, loginPath, portal ? "portal" : opts.loginKind || "system-login");
  const body = portal
    ? { semail: normalizeContapymeLoginId(username), password }
    : { username, password: wrapPassword(password) };
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      portal
        ? `No se pudo conectar con ${endpoint}. Comprueba que la API esté en ejecución y recarga con Ctrl+F5.`
        : `No se pudo conectar con el servicio de autenticación (${endpoint}).`,
    );
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok || !data.ok || !data.token) {
    throw new Error(formatLoginError(res, data, endpoint));
  }
  return data;
}

export function formatLocalDateTime(iso) {
  if (!iso) return "";
  const s = String(iso).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
