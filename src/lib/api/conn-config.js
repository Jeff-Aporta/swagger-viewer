/** Param ?conn= — JSON en base64url para autoconexión embed (ISS → demo GH Pages). */

function padB64(s) {
  let out = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4) out += "=";
  return out;
}

export function parseConnParam(raw) {
  if (!raw?.trim()) return null;
  try {
    const bin = atob(padB64(raw.trim()));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/** ?conn= o ?s= (b64url JSON); prioriza conn. */
export function parseEmbedParams(searchParams) {
  const connRaw = searchParams?.get?.("conn");
  const sRaw = searchParams?.get?.("s");
  return parseConnParam(connRaw) || parseConnParam(sRaw);
}

export function encodeConnParam(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
