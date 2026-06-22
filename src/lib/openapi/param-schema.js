export function paramSchemaType(schema) {
  return schema?.type || "";
}

export function sanitizeParamInputValue(schema, raw) {
  const t = paramSchemaType(schema);
  const s = String(raw ?? "");
  if (t === "integer") return s.replace(/\D/g, "");
  if (t === "number") {
    let out = "";
    let dot = false;
    for (const ch of s) {
      if (ch >= "0" && ch <= "9") out += ch;
      else if (ch === "." && !dot) {
        dot = true;
        out += ch;
      } else if (ch === "-" && !out) out += ch;
    }
    return out;
  }
  return s;
}

export function paramInputMode(schema) {
  const t = paramSchemaType(schema);
  if (t === "integer") return "numeric";
  if (t === "number") return "decimal";
  return "text";
}
