/** Query `q` — JSON → base64url (compatible con backend jagudeloe-tks). */

export function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function b64urlDecode(str) {
  let b = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return decodeURIComponent(escape(atob(b)));
}

export function encodeQueryQ(bag) {
  return b64urlEncode(JSON.stringify(bag ?? {}));
}

export function decodeQueryQ(raw) {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(b64urlDecode(raw.trim()));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
