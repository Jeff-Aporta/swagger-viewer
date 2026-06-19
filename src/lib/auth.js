/** Sesión JWT para Try it out (system-login). */

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

export async function fetchTestJwt(authBase, username, password) {
  const base = (authBase || location.origin).replace(/\/$/, "");
  let res;
  try {
    res = await fetch(`${base}/api/auth/test-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password: wrapPassword(password) }),
    });
  } catch {
    throw new Error("No se pudo conectar con el servicio de autenticación.");
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok || !data.ok || !data.token) {
    let err = data.error || `HTTP ${res.status}`;
    if (data.retryAfterSeconds) err += ` (reintenta en ${data.retryAfterSeconds} s)`;
    throw new Error(err);
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
