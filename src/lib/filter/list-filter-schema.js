/** JSON Schema del filtro ISS (`f`) derivado de x-iss-list-filter / catalog.listFilters. */

export const ISS_LIST_FILTER_DEFAULT_LIMIT = 9999;
export const ISS_LIST_FILTER_MAX_LIMIT = 9999;

export function sortKeysFromMeta(meta) {
  const s = meta?.sort;
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Object.keys(s);
}

export function distinctColumnsFromMeta(meta) {
  const explicit = meta?.distinct?.columns;
  if (explicit?.length) return [...explicit];
  const cols = new Set();
  for (const def of Object.values(meta?.eq || {})) {
    for (const c of def?.distinctLookup?.columns || []) cols.add(c);
  }
  return [...cols];
}

export function searchColumnOptionsFromMeta(meta) {
  const out = new Set();
  for (const c of distinctColumnsFromMeta(meta)) out.add(c);
  for (const c of meta?.search?.columns || []) out.add(c);
  if (meta?.search?.idColumn) out.add(meta.search.idColumn);
  return [...out];
}

function eqFieldJsonSchema(def) {
  const t = def?.type || "string";
  const base = {};
  if (def?.description) base.description = def.description;
  if (t === "integer" || t === "number") {
    return { ...base, type: t, ...(def?.enum ? { enum: def.enum } : {}), ...(def?.minimum != null ? { minimum: def.minimum } : {}), ...(def?.maximum != null ? { maximum: def.maximum } : {}) };
  }
  if (t === "boolean") return { ...base, type: "boolean" };
  return { ...base, type: "string", ...(def?.enum ? { enum: def.enum.map(String) } : {}) };
}

export function buildIssListFilterSchema(meta, opts = {}) {
  if (meta?.filterSchema && typeof meta.filterSchema === "object") return meta.filterSchema;
  const maxLimit = opts.maxLimit ?? ISS_LIST_FILTER_MAX_LIMIT;
  const defaultLimit = opts.defaultLimit ?? meta?.defaults?.limit ?? ISS_LIST_FILTER_DEFAULT_LIMIT;
  const sortKeys = sortKeysFromMeta(meta);
  const distinctCols = distinctColumnsFromMeta(meta);
  const searchCols = searchColumnOptionsFromMeta(meta);
  const eqProps = {};
  for (const [k, def] of Object.entries(meta?.eq || {})) eqProps[k] = eqFieldJsonSchema(def);
  const properties = {
    search: { type: "string", maxLength: 200, description: meta?.searchHint || meta?.search?.description || "Texto libre; el recurso define en qué columnas busca." },
    limit: { type: "integer", minimum: 1, maximum: maxLimit, default: defaultLimit },
    offset: { type: "integer", minimum: 0, default: meta?.defaults?.offset ?? 0 },
  };
  if (Object.keys(eqProps).length) {
    properties.eq = { type: "object", additionalProperties: false, properties: eqProps, description: "Filtros de igualdad exacta (AND)." };
  }
  if (sortKeys.length) {
    properties.sort = { type: "string", enum: [...sortKeys, ...sortKeys.map((k) => `-${k}`)], description: "Campo de orden. Prefijo `-` = descendente." };
  } else {
    properties.sort = { type: "string", maxLength: 64, description: "Campo de orden. Prefijo `-` = descendente." };
  }
  if (distinctCols.length) {
    properties.distinct = { type: "array", minItems: 1, items: { type: "string", enum: distinctCols }, description: meta?.distinct?.description || "Columnas para SELECT DISTINCT (lookup/autocomplete)." };
    if (searchCols.length) {
      properties.searchColumn = { type: "string", enum: searchCols, description: "Columna donde aplicar search (modo distinct o búsqueda acotada)." };
    }
  }
  return { type: "object", description: "Filtro ISS para listados (query `f` = JSON en Base64).", properties, additionalProperties: false };
}

export function allowedFilterFieldKeys(meta) {
  const keys = ["search", "limit", "offset", "eq", "sort"];
  if (distinctColumnsFromMeta(meta).length) keys.push("distinct", "searchColumn");
  return keys;
}
