/** Etiqueta de fila para x-iss-lookup — p. ej. `1859 | Solicitar videos | JUAN GARCIA`. */

import { stripContapymeEmail } from "../auth/auth.js";

export function parseJwtClaims(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function shortOwnerNick(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].toUpperCase();
  return `${parts[0]} ${parts[parts.length - 1]}`.toUpperCase();
}

export function resolveRowOwnerNick(row, lookup, session) {
  const field = lookup?.ownerNickField || "nick_propietario";
  const fromRow = row?.[field] ?? row?.nick ?? row?.nombre_propietario;
  if (fromRow != null && String(fromRow).trim()) return String(fromRow).trim();

  const claims = session?.claims || (session?.token ? parseJwtClaims(session.token) : null);
  const rowContacto = String(row?.icontacto ?? "").trim();
  const jwtContacto = String(claims?.icontacto ?? "").trim();
  if (rowContacto && jwtContacto && rowContacto === jwtContacto) {
    const full =
      session?.displayName ||
      [claims?.nombres, claims?.apellidos].filter(Boolean).join(" ").trim() ||
      stripContapymeEmail(session?.username || "") ||
      "";
    const nick = shortOwnerNick(full);
    if (nick) return nick;
  }
  return String(row?.icontacto ?? "").trim();
}

export function lookupLabelParts(row, lookup, session) {
  if (lookup?.labelField) {
    const t = String(row[lookup.labelField] ?? "").trim();
    return t ? [t] : [];
  }
  const id = row?.[lookup?.valueField || "id"];
  const title = row?.[lookup?.titleField || "titulo"] ?? "";
  const nick = resolveRowOwnerNick(row, lookup, session);
  return [id, title, nick].filter((p) => p != null && String(p).trim() !== "").map((p) => String(p).trim());
}

export function lookupLabelSeparator(lookup) {
  const sep = String(lookup?.labelSeparator ?? " | ").trim();
  return sep || "|";
}

export function formatLookupLabel(row, lookup, session) {
  if (lookup?.labelField) return String(row[lookup.labelField] ?? "");
  const parts = lookupLabelParts(row, lookup, session);
  return parts.join(lookup?.labelSeparator ?? " | ");
}
