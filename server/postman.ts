/**
 * OpenAPI 3.0 → Postman Collection v2.1 (DI-QA-001).
 * Carpetas por tag, descripciones Markdown, auth Bearer, ejemplos de respuesta.
 */
import {
    buildApiInfoDescription,
    buildTagFolderMarkdown,
    ISS_DOC_STANDARD,
    type FrontLink,
    type IssDocOperation,
} from "./docs.js";
import { ISS_DOC_MD_EXTENSION } from "./spec.js";

const POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";
const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
const SKIP_PATHS = new Set(["/swagger", "/swagger.json", "/swagger/postman.json", "/swagger/is.json"]);
const STATUS_PHRASE: Record<string, string> = {
    "200": "OK",
    "201": "Created",
    "204": "No Content",
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "409": "Conflict",
    "422": "Unprocessable Entity",
    "429": "Too Many Requests",
    "500": "Internal Server Error",
    "503": "Service Unavailable",
};

type OpenApiDoc = Record<string, unknown>;
type OpenApiOperation = Record<string, unknown>;
type PostmanItem = Record<string, unknown>;

export type PostmanExportOpts = {
    absoluteBaseUrl?: string;
    /** Resumen de la API para la descripción de la colección (fallback: info.description). */
    apiSummary?: string;
    frontLink?: FrontLink | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function asArray<T>(v: unknown): T[] {
    return Array.isArray(v) ? (v as T[]) : [];
}
function randomId(): string {
    return "iss-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function stripApiPrefix(path: string): string {
    if (path.startsWith("/api/")) return path.slice(4);
    if (path === "/api") return "/";
    return path;
}
function postmanPathSegments(openApiPath: string): { segments: string[]; variables: Array<Record<string, unknown>> } {
    const clean = stripApiPrefix(openApiPath);
    const parts = clean.split("/").filter(Boolean);
    const segments: string[] = [];
    const variables: Array<Record<string, unknown>> = [];
    for (const part of parts) {
        const m = /^\{([^}]+)\}$/.exec(part);
        if (m) {
            segments.push(`:${m[1]}`);
            variables.push({ key: m[1], value: "", description: `Path parameter :${m[1]}` });
        } else {
            segments.push(part);
        }
    }
    return { segments, variables };
}
function extractJsonExample(media: unknown): unknown {
    const m = asRecord(media);
    if (!m) return undefined;
    if (m.example !== undefined) return m.example;
    const examples = asRecord(m.examples);
    if (!examples) return undefined;
    for (const key of Object.keys(examples)) {
        const ex = asRecord(examples[key]);
        if (ex?.value !== undefined) return ex.value;
    }
    return undefined;
}
function sampleFromSchema(schema: unknown, depth = 0): unknown {
    if (depth > 4) return null;
    const s = asRecord(schema);
    if (!s) return null;
    if (s.example !== undefined) return s.example;
    if (s.$ref && typeof s.$ref === "string") return {};
    const type = s.type;
    if (type === "object" || s.properties) {
        const props = asRecord(s.properties) ?? {};
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props)) {
            out[k] = sampleFromSchema(v, depth + 1);
        }
        return out;
    }
    if (type === "array") return [sampleFromSchema(s.items, depth + 1)];
    if (type === "integer" || type === "number") return s.minimum ?? 1;
    if (type === "boolean") return false;
    if (type === "string") {
        if (s.format === "date-time") return "2026-06-19T15:30:00.000Z";
        return typeof s.example === "string" ? s.example : "string";
    }
    return null;
}
function paramTableMarkdown(parameters: unknown[]): string {
    if (!parameters.length) return "";
    const rows = parameters
        .map((p) => {
            const pr = asRecord(p);
            if (!pr) return "";
            const req = pr.required ? "Sí" : "No";
            const sch = asRecord(pr.schema);
            const type = String(sch?.type ?? pr.type ?? "string");
            const desc = String(pr.description ?? "").replace(/\|/g, "\\|");
            return `| \`${pr.name}\` | ${pr.in} | ${req} | ${type} | ${desc} |`;
        })
        .filter(Boolean);
    if (!rows.length) return "";
    return `### Parámetros
| Nombre | Ubicación | Requerido | Tipo | Descripción |
|--------|-----------|-----------|------|-------------|
${rows.join("\n")}`;
}
function responsesTableMarkdown(responses: Record<string, unknown>): string {
    const rows = Object.entries(responses).map(([code, raw]) => {
        const r = asRecord(raw);
        const desc = String(r?.description ?? "").replace(/\|/g, "\\|");
        return `| ${code} | ${STATUS_PHRASE[code] ?? "—"} | ${desc} |`;
    });
    if (!rows.length) return "";
    return `### Respuestas
| Código | Estado | Descripción |
|--------|--------|-------------|
${rows.join("\n")}`;
}
function buildRequestDescription(op: OpenApiOperation, method: string, path: string): string {
    const parts: string[] = [];
    const summary = String(op.summary ?? "").trim();
    const desc = String(op.description ?? "").trim();
    const docMd = String(op[ISS_DOC_MD_EXTENSION] ?? "").trim();
    if (summary) parts.push(`## ${summary}`);
    if (desc) parts.push(desc);
    if (docMd) parts.push(docMd);
    parts.push(`### Método y ruta
\`${method.toUpperCase()} {{base_url}}${stripApiPrefix(path)}\``);
    const security = asArray<Record<string, unknown>>(op.security);
    const needsAuth = security.length > 0 && !security.every((s) => Object.keys(s).length === 0);
    parts.push(`### Autorización
${needsAuth
        ? "Requiere **Bearer JWT** en `Authorization` (`Bearer {{token}}`)."
        : "No requiere autenticación."}`);
    const params = asArray<unknown>(op.parameters);
    const paramMd = paramTableMarkdown(params);
    if (paramMd) parts.push(paramMd);
    const requestBody = asRecord(op.requestBody);
    const rbContent = asRecord(requestBody?.content);
    const jsonBody = asRecord(rbContent?.["application/json"]);
    if (jsonBody) {
        const example = extractJsonExample(jsonBody) ?? sampleFromSchema(jsonBody.schema);
        parts.push(`### Body (application/json)
\`\`\`json
${JSON.stringify(example ?? {}, null, 2)}
\`\`\``);
    }
    const responses = asRecord(op.responses);
    if (responses) {
        const respMd = responsesTableMarkdown(responses);
        if (respMd) parts.push(respMd);
    }
    parts.push(`\n---\n*Generado desde OpenAPI · estándar ${ISS_DOC_STANDARD}*`);
    return parts.join("\n\n").trim();
}
function buildPostmanUrl(baseUrlVar: string, openApiPath: string, parameters: unknown[]): string {
    const { segments } = postmanPathSegments(openApiPath);
    const pathStr = segments.join("/");
    let raw = `${baseUrlVar}/${pathStr}`.replace(/([^:])\/{2,}/g, "$1/");
    const query: string[] = [];
    for (const p of parameters) {
        const pr = asRecord(p);
        if (!pr || pr.in !== "query") continue;
        const val = asRecord(pr.schema)?.example ?? "";
        query.push(`${encodeURIComponent(String(pr.name))}=${encodeURIComponent(String(val))}`);
    }
    if (query.length) raw += "?" + query.join("&");
    return raw;
}
function buildHeaders(method: string, parameters: unknown[]): Array<Record<string, unknown>> {
    const headers: Array<Record<string, unknown>> = [
        { key: "Accept", value: "application/json", description: "Formato de respuesta" },
    ];
    if (method === "post" || method === "put" || method === "patch") {
        headers.push({
            key: "Content-Type",
            value: "application/json",
            description: "Tipo de contenido del body",
        });
    }
    for (const p of parameters) {
        const pr = asRecord(p);
        if (pr?.in === "header") {
            headers.push({
                key: String(pr.name),
                value: String(asRecord(pr.schema)?.example ?? ""),
                description: pr.description ? String(pr.description) : undefined,
            });
        }
    }
    return headers;
}
function buildRequestBody(op: OpenApiOperation): Record<string, unknown> | undefined {
    const requestBody = asRecord(op.requestBody);
    const content = asRecord(requestBody?.content);
    const json = asRecord(content?.["application/json"]);
    if (!json) return undefined;
    const example = extractJsonExample(json) ?? sampleFromSchema(json.schema);
    return {
        mode: "raw",
        raw: JSON.stringify(example ?? {}, null, 2),
        options: { raw: { language: "json" } },
    };
}
function buildSavedResponses(
    op: OpenApiOperation,
    method: string,
    path: string,
    parameters: unknown[],
): Array<Record<string, unknown>> {
    const responses = asRecord(op.responses);
    if (!responses) return [];
    const baseRequest: Record<string, unknown> = {
        method: method.toUpperCase(),
        header: buildHeaders(method, parameters),
        url: buildPostmanUrl("{{base_url}}", path, parameters),
        description: "",
    };
    const body = buildRequestBody(op);
    if (body) baseRequest.body = body;
    const out: Array<Record<string, unknown>> = [];
    for (const [code, raw] of Object.entries(responses)) {
        const r = asRecord(raw);
        if (!r) continue;
        const content = asRecord(r.content);
        const json = asRecord(content?.["application/json"]);
        const example = json ? extractJsonExample(json) : undefined;
        if (example === undefined) continue;
        const desc = String(r.description ?? STATUS_PHRASE[code] ?? code);
        const name = `${code} - ${desc}`.slice(0, 120);
        out.push({
            name,
            originalRequest: { ...baseRequest },
            status: STATUS_PHRASE[code] ?? "OK",
            code: Number.parseInt(code, 10) || 200,
            _postman_previewlanguage: "json",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: JSON.stringify(example, null, 2),
        });
    }
    return out;
}
function buildRequestItem(method: string, path: string, op: OpenApiOperation): PostmanItem {
    const parameters = asArray<unknown>(op.parameters);
    const name = String(op.summary ?? `${method.toUpperCase()} ${stripApiPrefix(path)}`);
    const request: Record<string, unknown> = {
        method: method.toUpperCase(),
        header: buildHeaders(method, parameters),
        url: buildPostmanUrl("{{base_url}}", path, parameters),
        description: buildRequestDescription(op, method, path),
    };
    const body = buildRequestBody(op);
    if (body) request.body = body;
    const item: PostmanItem = { name, request };
    const responses = buildSavedResponses(op, method, path, parameters);
    if (responses.length) item.response = responses;
    return item;
}
function collectOperations(spec: OpenApiDoc): Map<string, { op: OpenApiOperation; method: string; path: string }[]> {
    const byTag = new Map<string, { op: OpenApiOperation; method: string; path: string }[]>();
    const paths = asRecord(spec.paths) ?? {};
    const defaultTag = "General";
    for (const [pathKey, pathItem] of Object.entries(paths)) {
        if (SKIP_PATHS.has(pathKey)) continue;
        const item = asRecord(pathItem);
        if (!item) continue;
        for (const method of HTTP_METHODS) {
            const op = asRecord(item[method]);
            if (!op) continue;
            const tags = asArray<string>(op.tags);
            const tag = tags[0] ?? defaultTag;
            if (!byTag.has(tag)) byTag.set(tag, []);
            byTag.get(tag)!.push({ op, method, path: pathKey });
        }
    }
    for (const list of byTag.values()) {
        list.sort((a, b) => {
            const pc = a.path.localeCompare(b.path);
            if (pc !== 0) return pc;
            return a.method.localeCompare(b.method);
        });
    }
    return byTag;
}
function tagDescription(spec: OpenApiDoc, tagName: string, ops: IssDocOperation[]): string {
    const tags = asArray<Record<string, unknown>>(spec.tags);
    const found = tags.find((t) => t.name === tagName);
    const scope = found?.description ? String(found.description) : `Endpoints del dominio ${tagName}.`;
    return buildTagFolderMarkdown(tagName, scope, ops);
}
function collectionDescription(spec: OpenApiDoc, opts: PostmanExportOpts): string {
    const info = asRecord(spec.info) ?? {};
    const summary =
        opts.apiSummary ??
        (info.description ? String(info.description) : "API REST documentada con OpenAPI.");
    const base = buildApiInfoDescription(summary, opts.frontLink ?? null);
    const serverNote = opts.absoluteBaseUrl
        ? `\n\n**URL base al exportar:** \`${opts.absoluteBaseUrl}\``
        : "";
    return `${base}${serverNote}
## Colección Postman
Importe este archivo en Postman. Configure \`base_url\` y \`token\` en las variables de la colección o en un entorno.
**Referencia:** ${ISS_DOC_STANDARD} — Guía de buenas prácticas para documentación de APIs.
`.trim();
}
function resolveBaseUrl(spec: OpenApiDoc, absoluteBaseUrl?: string): string {
    if (absoluteBaseUrl) return absoluteBaseUrl.replace(/\/$/, "");
    const servers = asArray<Record<string, unknown>>(spec.servers);
    const url = servers[0]?.url;
    if (typeof url === "string" && url.startsWith("http")) return url.replace(/\/$/, "");
    return "{{base_url}}";
}

/** Convierte un documento OpenAPI 3.x a colección Postman v2.1. */
export function openApiToPostmanCollection(
    spec: OpenApiDoc,
    opts: PostmanExportOpts = {},
): Record<string, unknown> {
    const info = asRecord(spec.info) ?? {};
    const title = String(info.title ?? "API");
    const baseUrl = resolveBaseUrl(spec, opts.absoluteBaseUrl);
    const byTag = collectOperations(spec);
    const items: PostmanItem[] = [];
    const sortedTags = [...byTag.keys()].sort((a, b) => a.localeCompare(b));
    for (const tagName of sortedTags) {
        const entries = byTag.get(tagName) ?? [];
        const opSummaries: IssDocOperation[] = entries.map((e) => ({
            method: e.method.toUpperCase(),
            path: stripApiPrefix(e.path),
            summary: String(e.op.summary ?? e.path),
        }));
        const folderDesc = tagDescription(spec, tagName, opSummaries);
        items.push({
            name: tagName,
            description: folderDesc,
            item: entries.map((e) => buildRequestItem(e.method, e.path, e.op)),
        });
    }
    return {
        info: {
            _postman_id: randomId(),
            name: title,
            description: collectionDescription(spec, opts),
            schema: POSTMAN_SCHEMA,
        },
        auth: {
            type: "bearer",
            bearer: [{ key: "token", value: "{{token}}", type: "string" }],
        },
        variable: [
            { key: "base_url", value: baseUrl, type: "string" },
            { key: "token", value: "", type: "string" },
        ],
        item: items,
    };
}
