/** JSON Schema del filtro ISS (`f`) derivado de `catalog.listFilters` en openapi-config. */

export const ISS_LIST_FILTER_DEFAULT_LIMIT = 9999;
export const ISS_LIST_FILTER_MAX_LIMIT = 9999;

export type IssListFilterEqFieldMeta = {
    type?: string;
    description?: string;
    enum?: unknown[];
    minimum?: number;
    maximum?: number;
    distinctLookup?: { columns?: string[]; searchField?: string };
};

export type IssListFilterCatalogMeta = {
    listPath?: string;
    defaults?: { limit?: number; offset?: number; sort?: string };
    searchHint?: string;
    search?: { columns?: string[]; idColumn?: string; description?: string };
    distinct?: { columns?: string[]; description?: string };
    eq?: Record<string, IssListFilterEqFieldMeta>;
    sort?: Record<string, { label?: string }> | string[];
    filterSchema?: Record<string, unknown>;
};

export function sortKeysFromMeta(meta: IssListFilterCatalogMeta): string[] {
    const s = meta.sort;
    if (!s) return [];
    if (Array.isArray(s)) return s;
    return Object.keys(s);
}

export function distinctColumnsFromMeta(meta: IssListFilterCatalogMeta): string[] {
    const explicit = meta.distinct?.columns;
    if (explicit?.length) return [...explicit];
    const cols = new Set<string>();
    for (const def of Object.values(meta.eq || {})) {
        for (const c of def.distinctLookup?.columns || []) cols.add(c);
    }
    return [...cols];
}

export function searchColumnOptionsFromMeta(meta: IssListFilterCatalogMeta): string[] {
    const out = new Set<string>();
    for (const c of distinctColumnsFromMeta(meta)) out.add(c);
    for (const c of meta.search?.columns || []) out.add(c);
    if (meta.search?.idColumn) out.add(meta.search.idColumn);
    return [...out];
}

function eqFieldJsonSchema(def: IssListFilterEqFieldMeta): Record<string, unknown> {
    const t = def.type || "string";
    const base: Record<string, unknown> = {};
    if (def.description) base.description = def.description;
    if (t === "integer" || t === "number") {
        return { ...base, type: t, ...(def.enum ? { enum: def.enum } : {}), ...(def.minimum != null ? { minimum: def.minimum } : {}), ...(def.maximum != null ? { maximum: def.maximum } : {}) };
    }
    if (t === "boolean") return { ...base, type: "boolean" };
    return { ...base, type: "string", ...(def.enum ? { enum: def.enum.map(String) } : {}) };
}

export function buildIssListFilterSchema(meta: IssListFilterCatalogMeta, opts?: { maxLimit?: number; defaultLimit?: number }): Record<string, unknown> {
    if (meta.filterSchema && typeof meta.filterSchema === "object") return meta.filterSchema;
    const maxLimit = opts?.maxLimit ?? ISS_LIST_FILTER_MAX_LIMIT;
    const defaultLimit = opts?.defaultLimit ?? meta.defaults?.limit ?? ISS_LIST_FILTER_DEFAULT_LIMIT;
    const sortKeys = sortKeysFromMeta(meta);
    const distinctCols = distinctColumnsFromMeta(meta);
    const searchCols = searchColumnOptionsFromMeta(meta);
    const eqProps: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(meta.eq || {})) eqProps[k] = eqFieldJsonSchema(def);
    const properties: Record<string, unknown> = {
        search: { type: "string", maxLength: 200, description: meta.searchHint || meta.search?.description || "Texto libre; el recurso define en qué columnas busca." },
        limit: { type: "integer", minimum: 1, maximum: maxLimit, default: defaultLimit },
        offset: { type: "integer", minimum: 0, default: meta.defaults?.offset ?? 0 },
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
        properties.distinct = { type: "array", minItems: 1, items: { type: "string", enum: distinctCols }, description: meta.distinct?.description || "Columnas para SELECT DISTINCT (lookup/autocomplete)." };
        if (searchCols.length) {
            properties.searchColumn = { type: "string", enum: searchCols, description: "Columna donde aplicar search (modo distinct o búsqueda acotada)." };
        }
    }
    return { type: "object", description: "Filtro ISS para listados (query `f` = JSON en Base64).", properties, additionalProperties: false };
}

export function enrichListFilterMeta(meta: Record<string, unknown>): Record<string, unknown> {
    const m = meta as IssListFilterCatalogMeta;
    return { ...meta, filterSchema: m.filterSchema ?? buildIssListFilterSchema(m) };
}

export function enrichListFilterCatalog(catalog: { listFilters?: Record<string, unknown> } | undefined): { listFilters?: Record<string, unknown> } {
    const listFilters = catalog?.listFilters;
    if (!listFilters) return catalog ?? {};
    const enriched: Record<string, unknown> = {};
    for (const [key, meta] of Object.entries(listFilters)) {
        enriched[key] = enrichListFilterMeta(meta as Record<string, unknown>);
    }
    return { ...catalog, listFilters: enriched };
}
