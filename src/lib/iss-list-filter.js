/** Filtro ISS (query `f` = JSON en Base64) — validación alineada con IssListFilter.ts */

export const ISS_LIST_FILTER_QUERY_PARAM = "f";
export const ISS_LIST_FILTER_EXT = "x-iss-list-filter";
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export function encodeIssFilterB64(jsonStr) {
  if (!jsonStr || !String(jsonStr).trim()) return "";
  return btoa(unescape(encodeURIComponent(String(jsonStr))));
}

export function decodeIssFilterB64(b64) {
  if (!b64?.trim()) return "";
  return decodeURIComponent(escape(atob(String(b64).trim())));
}

export function emptyIssFilter(defaults = {}) {
  return { limit: defaults.limit ?? DEFAULT_LIMIT, offset: defaults.offset ?? 0, eq: {} };
}

export function parseIssFilterRaw(raw) {
  if (raw == null || !String(raw).trim()) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(String(raw).trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "El filtro debe ser un objeto JSON." };
    }
    return validateIssFilter(parsed, {});
  } catch {
    return { ok: false, error: "JSON inválido." };
  }
}

export function parseIssFilterQueryValue(raw) {
  if (raw == null || !String(raw).trim()) return { ok: true, value: {} };
  const s = String(raw).trim();
  try {
    const json = s.startsWith("{") ? s : decodeIssFilterB64(s);
    return parseIssFilterRaw(json);
  } catch {
    return { ok: false, error: "Base64 inválido." };
  }
}

export function validateIssFilter(src, ext = {}) {
  const allowedEq = new Set(Object.keys(ext.eq || {}));
  const allowedSort = sortKeys(ext);
  const out = {};
  const errors = [];

  if (src.search !== undefined) {
    const search = String(src.search).trim();
    if (search) {
      if (search.length > 200) errors.push("search: máximo 200 caracteres.");
      else out.search = search;
    }
  }

  if (src.limit !== undefined) {
    const n = Number(src.limit);
    if (!Number.isFinite(n) || n < 1 || n > MAX_LIMIT) errors.push(`limit: entero entre 1 y ${MAX_LIMIT}.`);
    else out.limit = Math.floor(n);
  }

  if (src.offset !== undefined) {
    const n = Number(src.offset);
    if (!Number.isFinite(n) || n < 0) errors.push("offset: entero ≥ 0.");
    else out.offset = Math.floor(n);
  }

  if (src.sort !== undefined) {
    const sort = String(src.sort).trim();
    if (sort) {
      const field = sort.startsWith("-") ? sort.slice(1) : sort;
      if (allowedSort.length && !allowedSort.includes(field)) {
        errors.push(`sort: use uno de ${allowedSort.join(", ")} (prefijo - = descendente).`);
      } else if (sort.length > 64) errors.push("sort: máximo 64 caracteres.");
      else out.sort = sort;
    }
  }

  if (src.eq !== undefined) {
    if (!src.eq || typeof src.eq !== "object" || Array.isArray(src.eq)) {
      errors.push("eq: debe ser un objeto.");
    } else {
      const eq = {};
      for (const [key, value] of Object.entries(src.eq)) {
        if (value === null || value === undefined || value === "") continue;
        if (allowedEq.size && !allowedEq.has(key)) {
          errors.push(`eq.${key}: no permitido en este endpoint.`);
          continue;
        }
        const def = ext.eq?.[key] || {};
        const t = def.type || "string";
        if (t === "integer" || t === "number") {
          const n = Number(value);
          if (!Number.isFinite(n)) errors.push(`eq.${key}: debe ser numérico.`);
          else if (def.enum && !def.enum.includes(n)) errors.push(`eq.${key}: valor no permitido.`);
          else eq[key] = Math.floor(n);
        } else if (t === "boolean") {
          eq[key] = value === true || value === "true" || value === 1 || value === "1";
        } else {
          eq[key] = String(value);
        }
      }
      if (Object.keys(eq).length) out.eq = eq;
    }
  }

  const extra = Object.keys(src).filter((k) => !["search", "limit", "offset", "eq", "sort"].includes(k));
  if (extra.length) errors.push(`Campos no permitidos: ${extra.join(", ")}.`);

  if (errors.length) return { ok: false, error: errors.join(" ") };
  return { ok: true, value: out };
}

export function serializeIssFilter(bag, ext = {}) {
  const defLimit = ext.defaults?.limit ?? DEFAULT_LIMIT;
  const defOffset = ext.defaults?.offset ?? 0;
  const out = {};
  if (bag.search?.trim()) out.search = bag.search.trim();
  if (bag.limit != null && bag.limit !== "" && Number(bag.limit) !== defLimit) out.limit = Number(bag.limit);
  if (bag.offset != null && bag.offset !== "" && Number(bag.offset) !== defOffset) out.offset = Number(bag.offset);
  if (bag.sort?.trim()) out.sort = bag.sort.trim();
  const eq = bag.eq || {};
  const eqOut = {};
  for (const [k, v] of Object.entries(eq)) {
    if (v !== null && v !== undefined && v !== "") eqOut[k] = v;
  }
  if (Object.keys(eqOut).length) out.eq = eqOut;
  return Object.keys(out).length ? JSON.stringify(out) : "";
}

/** Valor listo para query `f` (Base64 del JSON). */
export function serializeIssFilterQuery(bag, ext = {}) {
  const json = serializeIssFilter(bag, ext);
  return json ? encodeIssFilterB64(json) : "";
}

export function bagFromFilterValue(raw, ext = {}) {
  const parsed = parseIssFilterQueryValue(raw);
  const base = emptyIssFilter(ext.defaults);
  if (!parsed.ok || !parsed.value) return base;
  const v = parsed.value;
  return {
    search: v.search || "",
    limit: v.limit ?? base.limit,
    offset: v.offset ?? base.offset,
    sort: v.sort || "",
    eq: { ...base.eq, ...(v.eq || {}) },
  };
}

function sortKeys(ext) {
  const s = ext.sort;
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Object.keys(s);
}

export function sortOptions(ext) {
  const keys = sortKeys(ext);
  const labels = typeof ext.sort === "object" && !Array.isArray(ext.sort) ? ext.sort : {};
  const opts = [{ value: "", label: "(sin orden)" }];
  for (const key of keys) {
    const meta = labels[key] || {};
    const label = meta.label || key;
    opts.push({ value: key, label: `${label} ↑` }, { value: `-${key}`, label: `${label} ↓` });
  }
  return opts;
}
