/**
 * Construye OpenAPI 3 desde JSON declarativo (insoft.openapi-config).
 * El host ISS/worker solo mantiene el JSON de dominio.
 */
import {
    EXAMPLE_401,
    EXAMPLE_404,
    exampleOk,
    INSOFT_ERROR_SCHEMA,
    INSOFT_RESPONSE_SCHEMA,
} from "./envelope.js";
import { buildOpenApiServers } from "./api-presets.js";
import {
    ISS_DOC_MD_EXTENSION,
    ISS_INPUT_RECOMMENDATION_EXTENSION,
    ISS_LIST_FILTER_EXTENSION,
    ISS_LOOKUP_EXTENSION,
    ISS_REQUEST_BODY_EXAMPLES_EXTENSION,
    ISS_SUBGROUP_EXTENSION,
    ISS_SUBGROUPS_EXTENSION,
    bearerComponents,
    bearerSecurity,
    issRspAuth,
    issRspAuthForbidden,
    issRspAuthNotFound,
    issRspHealth,
    issRspOk,
    issRspSseDoc,
    jsonRequestBody,
    jsonResponse,
} from "./spec.js";
import { enrichListFilterMeta } from "./list-filter-schema.js";

function encodeIssFilterB64(obj: Record<string, unknown>): string {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

function resolveFPreset(catalog: IsOpenApiConfig["catalog"], key?: string): Record<string, unknown> | undefined {
    if (!key) return undefined;
    const p = catalog.fPresets?.[key];
    if (!p || typeof p !== "object" || Array.isArray(p)) {
        throw new Error(`openapi-config: fPreset «${key}» no definido`);
    }
    return { ...(p as Record<string, unknown>) };
}

function resolveInputRecommendation(catalog: IsOpenApiConfig["catalog"], key: string): Record<string, unknown> {
    const rec = catalog.inputRecommendations?.[key];
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
        throw new Error(`openapi-config: inputRecommendations «${key}» no definido`);
    }
    const out: Record<string, unknown> = { ...(rec as Record<string, unknown>) };
    if (typeof out.fPreset === "string") {
        out.listFilter = resolveFPreset(catalog, out.fPreset);
        delete out.fPreset;
    }
    return out;
}

function resolveLookup(catalog: IsOpenApiConfig["catalog"], key: string): Record<string, unknown> | undefined {
    const raw = catalog.lookups?.[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const out: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
    if (typeof out.fPreset === "string") {
        out.listFilter = resolveFPreset(catalog, out.fPreset);
        delete out.fPreset;
    }
    const recKey = out.inputRecommend;
    if (typeof recKey === "string") {
        delete out.inputRecommend;
        Object.assign(out, resolveInputRecommendation(catalog, recKey));
    }
    return out;
}

function enrichSchemaProperties(catalog: IsOpenApiConfig["catalog"], schema: Record<string, unknown>): Record<string, unknown> {
    const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
    if (!props) return schema;
    const nextProps: Record<string, unknown> = {};
    for (const [name, prop] of Object.entries(props)) {
        const ref = prop.inputRecommend;
        if (typeof ref === "string") {
            const { inputRecommend, ...rest } = prop;
            nextProps[name] = { ...rest, [ISS_INPUT_RECOMMENDATION_EXTENSION]: resolveInputRecommendation(catalog, ref) };
        } else {
            nextProps[name] = prop;
        }
    }
    return { ...schema, properties: nextProps };
}

export const OPENAPI_RESPONSE_TEMPLATES = [
    "health",
    "auth",
    "authForbidden",
    "authNotFound",
    "sse",
    "ok",
    "deleteEnvelope",
    "raw",
] as const;

export type OpenApiResponseTemplate = (typeof OPENAPI_RESPONSE_TEMPLATES)[number];

/** Respuesta declarativa en openapi-config JSON (template inferido como string al importar JSON). */
export type IsOpenApiResponseConfig = {
    template: string;
    description?: string;
    payload?: string;
    schema?: string;
    items?: Record<string, { description: string; schema?: Record<string, unknown>; example?: unknown; payload?: string }>;
};

export type IsOpenApiParamConfig =
    | Record<string, unknown>
    | { template: string; description?: string; lookup?: string };

export type IsOpenApiRequestBodyConfig = {
    description: string;
    schema: Record<string, unknown>;
    bodyKey?: string;
    example?: unknown;
};

export type IsOpenApiOperationConfig = {
    summary: string;
    description?: string;
    operationId?: string;
    tags: string[];
    subgroup?: string;
    security?: "bearer" | "none" | string;
    /** Modal Try it out (solo con security bearer + POST/PUT/PATCH/DELETE). String = catalog.tryitConfirm.templates[id]. */
    tryitConfirm?: string | Record<string, unknown> | false;
    doc?: string;
    parameters?: IsOpenApiParamConfig[];
    requestBody?: IsOpenApiRequestBodyConfig;
    requestBodyExamples?: string;
    responses: IsOpenApiResponseConfig;
};

export type IsOpenApiConfig = {
    kind?: string;
    version?: number;
    openapi?: string;
    info: { title: string; description?: string; version: string };
    tags: Array<Record<string, unknown>>;
    catalog: {
        schemas?: Record<string, Record<string, unknown>>;
        payloads?: Record<string, unknown>;
        lookups?: Record<string, unknown>;
        listFilters?: Record<string, unknown>;
        fPresets?: Record<string, unknown>;
        inputRecommendations?: Record<string, unknown>;
        requestBodies?: Record<string, Record<string, unknown>>;
        requestBodyExamples?: Record<string, unknown[]>;
        docs?: Record<string, string>;
    };
    /** Config del visor IS-Swagger (auth, brand, exports). URLs se resuelven en build-exports. */
    viewer?: Record<string, unknown>;
    /** Rutas expuestas al protocolo de tests / integración (filtro y prefijo sobre OpenAPI generado). */
    protocol?: {
        serverUrl?: string;
        pathPrefix?: string;
        excludePathPatterns?: string[];
        ensureApiPrefix?: boolean;
    };
    paths: Record<string, Record<string, IsOpenApiOperationConfig>>;
};

function sg(id: string) {
    return { [ISS_SUBGROUP_EXTENSION]: id };
}

function resolvePayload(catalog: IsOpenApiConfig["catalog"], key: string): unknown {
    const p = catalog.payloads?.[key];
    if (p === undefined) throw new Error(`openapi-config: payload «${key}» no definido`);
    return exampleOk(p);
}

function resolveSchema(catalog: IsOpenApiConfig["catalog"], key?: string): Record<string, unknown> | undefined {
    if (!key) return undefined;
    const s = catalog.schemas?.[key];
    if (!s) throw new Error(`openapi-config: schema «${key}» no definido`);
    return s;
}

function resolveExample(catalog: IsOpenApiConfig["catalog"], item: { example?: unknown; payload?: string }): unknown {
    if (item.example !== undefined) return item.example;
    if (item.payload) return resolvePayload(catalog, item.payload);
    return undefined;
}

function buildResponses(catalog: IsOpenApiConfig["catalog"], def: IsOpenApiResponseConfig): Record<string, unknown> {
    switch (def.template as OpenApiResponseTemplate) {
        case "health":
            if (!def.payload) throw new Error("openapi-config: health requiere payload");
            return issRspHealth(resolvePayload(catalog, def.payload));
        case "auth":
            if (!def.description || !def.payload) throw new Error("openapi-config: auth requiere description y payload");
            return issRspAuth(def.description, resolvePayload(catalog, def.payload), resolveSchema(catalog, def.schema));
        case "authForbidden":
            if (!def.description || !def.payload) throw new Error("openapi-config: authForbidden requiere description y payload");
            return issRspAuthForbidden(
                def.description,
                resolvePayload(catalog, def.payload),
                resolveSchema(catalog, def.schema),
            );
        case "authNotFound":
            if (!def.description || !def.payload) throw new Error("openapi-config: authNotFound requiere description y payload");
            return issRspAuthNotFound(
                def.description,
                resolvePayload(catalog, def.payload),
                resolveSchema(catalog, def.schema),
            );
        case "sse":
            if (!def.description || !def.payload) throw new Error("openapi-config: sse requiere description y payload");
            return issRspSseDoc(def.description, resolvePayload(catalog, def.payload));
        case "ok":
            if (!def.description || !def.payload) throw new Error("openapi-config: ok requiere description y payload");
            return { "200": issRspOk(def.description, resolvePayload(catalog, def.payload)) };
        case "deleteEnvelope": {
            if (!def.description || !def.payload) throw new Error("openapi-config: deleteEnvelope requiere description y payload");
            const rowSchema = resolveSchema(catalog, def.schema ?? "conversacionRow");
            return {
                "200": jsonResponse(
                    def.description,
                    {
                        ...INSOFT_RESPONSE_SCHEMA,
                        properties: {
                            ...INSOFT_RESPONSE_SCHEMA.properties,
                            respuesta: rowSchema,
                        },
                    },
                    resolvePayload(catalog, def.payload),
                ),
                "404": jsonResponse("Conversación no encontrada", INSOFT_ERROR_SCHEMA, EXAMPLE_404),
                "401": jsonResponse("No autorizado", INSOFT_ERROR_SCHEMA, EXAMPLE_401),
            };
        }
        case "raw": {
            if (!def.items) throw new Error("openapi-config: raw requiere items");
            const out: Record<string, unknown> = {};
            for (const [code, item] of Object.entries(def.items)) {
                out[code] = jsonResponse(item.description, item.schema ?? { type: "object" }, resolveExample(catalog, item));
            }
            return out;
        }
        default:
            throw new Error(`openapi-config: template de respuesta desconocido «${def.template}»`);
    }
}

function resolveParam(catalog: IsOpenApiConfig["catalog"], p: IsOpenApiParamConfig): Record<string, unknown> {
    if (p && typeof p === "object" && "template" in p && p.template === "iconversacionPath") {
        const lookupKey = String((p as { lookup?: string }).lookup ?? "conversacion");
        const lookup = resolveLookup(catalog, lookupKey);
        return {
            name: "iconversacion",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1, example: 4821 },
            description: p.description ?? "ID de conversación.",
            ...(lookup ? { [ISS_LOOKUP_EXTENSION]: lookup } : {}),
        };
    }
    const raw = { ...(p as Record<string, unknown>) };
    const listFilter = raw.listFilter;
    if (typeof listFilter === "string") {
        delete raw.listFilter;
        const meta = catalog.listFilters?.[listFilter];
        if (meta) raw[ISS_LIST_FILTER_EXTENSION] = enrichListFilterMeta(meta as Record<string, unknown>);
    }
    const inputRecommend = raw.inputRecommend;
    if (typeof inputRecommend === "string") {
        delete raw.inputRecommend;
        const rec = resolveInputRecommendation(catalog, inputRecommend);
        raw[ISS_INPUT_RECOMMENDATION_EXTENSION] = rec;
        if (raw.name === "f" && rec.listFilter && typeof rec.listFilter === "object") {
            raw.schema = { type: "string", example: encodeIssFilterB64(rec.listFilter as Record<string, unknown>) };
        }
    }
    return raw;
}

function buildOperation(catalog: IsOpenApiConfig["catalog"], def: IsOpenApiOperationConfig): Record<string, unknown> {
    const op: Record<string, unknown> = {
        summary: def.summary,
        tags: def.tags,
    };
    if (def.description) op.description = def.description;
    if (def.operationId) op.operationId = def.operationId;
    if (def.subgroup) Object.assign(op, sg(def.subgroup));
    if (def.security === "bearer") op.security = bearerSecurity;
    if (def.tryitConfirm !== undefined) op.tryitConfirm = def.tryitConfirm;
    if (def.doc) {
        const md = catalog.docs?.[def.doc];
        if (md) op[ISS_DOC_MD_EXTENSION] = md;
    }
    if (def.parameters?.length) {
        op.parameters = def.parameters.map((p) => resolveParam(catalog, p));
    }
    if (def.requestBodyExamples) {
        const presets = catalog.requestBodyExamples?.[def.requestBodyExamples];
        if (presets) op[ISS_REQUEST_BODY_EXAMPLES_EXTENSION] = presets;
    }
    if (def.requestBody) {
        const rb = def.requestBody;
        let example: unknown = rb.example;
        if (rb.bodyKey && catalog.requestBodies?.[rb.bodyKey]) {
            example = catalog.requestBodies[rb.bodyKey];
        }
        op.requestBody = jsonRequestBody(rb.description, enrichSchemaProperties(catalog, rb.schema), example ?? {});
    }
    op.responses = buildResponses(catalog, def.responses);
    return op;
}

/** Genera documento OpenAPI 3 desde configuración JSON declarativa. */
export function buildOpenApiFromConfig(config: IsOpenApiConfig, serverUrl?: string): Record<string, unknown> {
    const base = serverUrl?.replace(/\/$/, "") || "/api";
    const catalog = config.catalog ?? {};
    const paths: Record<string, Record<string, unknown>> = {};
    for (const [path, methods] of Object.entries(config.paths)) {
        const item: Record<string, unknown> = {};
        for (const [method, opDef] of Object.entries(methods)) {
            item[method] = buildOperation(catalog, opDef);
        }
        paths[path] = item;
    }
    const tags = config.tags.map((t) => {
        const tag = { ...t };
        if (Array.isArray(tag.subgroups)) {
            tag[ISS_SUBGROUPS_EXTENSION] = tag.subgroups;
            delete tag.subgroups;
        }
        return tag;
    });
    return {
        openapi: config.openapi ?? "3.0.3",
        info: {
            title: config.info.title,
            description: config.info.description ?? "",
            version: config.info.version,
        },
        servers: buildOpenApiServers(base),
        tags,
        components: { ...bearerComponents() },
        paths,
    };
}
