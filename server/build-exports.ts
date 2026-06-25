/**
 * Pipeline único: insoft.openapi-config → OpenAPI 3, Postman v2.1, documento IS.
 * El host solo mantiene un JSON declarativo; los formatos de industria se infieren aquí.
 */
import { buildOpenApiFromConfig, type IsOpenApiConfig } from "./build-spec.js";
import { enrichListFilterCatalog } from "./list-filter-schema.js";
import { openApiToPostmanCollection, type PostmanExportOpts } from "./postman.js";
import { SWAGGER_FRONT_SHARED_REF, SWAGGER_VIEWER_GH_REPO, SWAGGER_VIEWER_REF } from "./viewer-pins.js";
import { DEFAULT_AUTH_LOGIN_PATH, resolveOrchestratorBase } from "./orchestrator-auth.js";

export type { IsOpenApiConfig } from "./build-spec.js";

export const OPENAPI_CONFIG_KIND = "insoft.openapi-config";
export const OPENAPI_CONFIG_VERSION = 1;
export const IS_DOCUMENT_KIND = "insoft.swagger-viewer";
export const IS_DOCUMENT_VERSION = 1;

const RUNTIME_VIEWER_KEYS = new Set(["cssUrl", "stackUrl", "isaUrl", "appUrl", "specUrl", "url", "spec", "root", "exports", "loadMarked"]);

export type IssOpenApiViewerConfig = {
    ns?: string;
    app?: string;
    shell?: boolean;
    auth?: { enabled?: boolean; loginUrl?: string; loginKind?: string; loginPath?: string };
    brand?: { title?: string; icon?: string };
    frontLinks?: Array<{ label: string; url: string }>;
    exports?: {
        openApiDownloadName?: string;
        postmanDownloadName?: string;
        isDownloadName?: string;
    };
    embed?: { title?: string; authKind?: string; localCdnBase?: string };
    nav?: Array<{ id: string; label: string; icon?: string; tags?: string[]; access?: unknown }>;
    scopes?: Array<{ id: string; label: string; base: string; icon?: string }>;
    viewerRef?: string;
    frontSharedRef?: string;
};

export type IssExportsResult = {
    config: IsOpenApiConfig;
    openApi: Record<string, unknown>;
    postman: Record<string, unknown>;
    viewer: Record<string, unknown>;
    is: Record<string, unknown>;
    embed: Record<string, unknown>;
};

export type BuildIssExportsOpts = {
    serverUrl?: string;
    specUrl?: string;
    absoluteBaseUrl?: string;
    apiSummary?: string;
    frontLink?: PostmanExportOpts["frontLink"];
};

export type OpenApiProtocolPathsOpts = {
    pathPrefix?: string;
    excludePathPatterns?: string[];
    ensureApiPrefix?: boolean;
};

function viewerConfigFromBoot(config: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config)) {
        if (RUNTIME_VIEWER_KEYS.has(k) || v === undefined) continue;
        out[k] = v;
    }
    return out;
}

function prepareOpenApiConfig(raw: IsOpenApiConfig): IsOpenApiConfig {
    const catalog = enrichListFilterCatalog(raw.catalog ?? {});
    return { ...raw, catalog: { ...raw.catalog, ...catalog } };
}

function resolveApiBase(serverUrl: string | undefined, absoluteBaseUrl?: string): string {
    const raw = (absoluteBaseUrl ?? serverUrl ?? "/api").replace(/\/$/, "");
    return raw;
}

function buildViewerRuntimeConfig(config: IsOpenApiConfig, apiBase: string): Record<string, unknown> {
    const v = (config.viewer ?? {}) as IssOpenApiViewerConfig;
    const base = apiBase.replace(/\/$/, "");
    return {
        apiBase: base,
        configUrl: `${base}/swagger/config.json`,
        ns: v.ns ?? "ISA",
        app: v.app ?? "swagger-viewer",
        shell: v.shell ?? true,
        auth: {
            enabled: v.auth?.enabled ?? true,
            loginUrl: resolveOrchestratorBase(apiBase),
            loginKind: v.auth?.loginKind ?? "portal",
            loginPath: String(v.auth?.loginPath ?? DEFAULT_AUTH_LOGIN_PATH).includes("portal-login")
                ? DEFAULT_AUTH_LOGIN_PATH
                : (v.auth?.loginPath ?? DEFAULT_AUTH_LOGIN_PATH),
        },
        brand: v.brand ?? { title: config.info?.title ?? "API", icon: "mdi:api" },
        frontLinks: v.frontLinks ?? [],
        exports: {
            openApiDownloadName: v.exports?.openApiDownloadName ?? "openapi.json",
            postmanDownloadName: v.exports?.postmanDownloadName ?? "postman_collection.json",
            isDownloadName: v.exports?.isDownloadName ?? "api.is.json",
        },
        viewerRef: v.viewerRef ?? SWAGGER_VIEWER_REF,
        frontSharedRef: v.frontSharedRef ?? SWAGGER_FRONT_SHARED_REF,
        ...(Array.isArray(v.nav) && v.nav.length ? { nav: v.nav } : {}),
        ...(Array.isArray(v.scopes) && v.scopes.length ? { scopes: v.scopes } : {}),
    };
}

function buildEmbedOpts(config: IsOpenApiConfig, apiBase: string, viewer: Record<string, unknown>): Record<string, unknown> {
    const v = (config.viewer ?? {}) as IssOpenApiViewerConfig;
    const embed = v.embed ?? {};
    const exports = viewer.exports as Record<string, unknown> | undefined;
    return {
        apiBase,
        configUrl: viewer.configUrl,
        title: embed.title ?? config.info?.title ?? "API",
        authKind: embed.authKind ?? (viewer.auth as Record<string, unknown>)?.loginKind ?? "portal",
        authLoginUrl: (viewer.auth as Record<string, unknown>)?.loginUrl,
        authLoginPath: (viewer.auth as Record<string, unknown>)?.loginPath,
        brand: viewer.brand,
        ns: viewer.ns,
        app: viewer.app,
        shell: viewer.shell,
        frontLinks: viewer.frontLinks,
        exports,
        postmanDownloadName: exports?.postmanDownloadName,
        isDownloadName: exports?.isDownloadName,
        viewerRef: viewer.viewerRef,
        frontSharedRef: viewer.frontSharedRef,
        viewerRepo: SWAGGER_VIEWER_GH_REPO,
        localCdnBase: embed.localCdnBase,
    };
}

/** Filtra y normaliza paths OpenAPI para protocolos de test / integración. */
export function openApiProtocolPaths(
    paths: Record<string, Record<string, unknown>>,
    opts: OpenApiProtocolPathsOpts = {},
): Record<string, Record<string, unknown>> {
    const pathPrefix = opts.pathPrefix ?? "/api";
    const exclude = (opts.excludePathPatterns ?? []).map((p) => new RegExp(p));
    const ensureApi = opts.ensureApiPrefix !== false;
    const out: Record<string, Record<string, unknown>> = {};
    for (const [path, ops] of Object.entries(paths)) {
        if (exclude.some((re) => re.test(path))) continue;
        let key = path;
        if (ensureApi && !path.startsWith(pathPrefix)) {
            key = path === "/" ? pathPrefix : `${pathPrefix}${path}`;
        }
        out[key] = ops;
    }
    return out;
}

/** Paths del protocolo desde insoft.openapi-config (usa sección `protocol` del JSON). */
export function protocolPathsFromConfig(raw: IsOpenApiConfig, opts: BuildIssExportsOpts = {}): Record<string, Record<string, unknown>> {
    const { openApi, config } = buildIssExportsFromConfig(raw, opts);
    const protocol = config.protocol ?? {};
    const paths = (openApi.paths ?? {}) as Record<string, Record<string, unknown>>;
    return openApiProtocolPaths(paths, protocol);
}

function buildIsDocument(viewer: Record<string, unknown>, spec: Record<string, unknown>): Record<string, unknown> {
    return { kind: IS_DOCUMENT_KIND, version: IS_DOCUMENT_VERSION, viewer: viewerConfigFromBoot(viewer), spec };
}

/** Normaliza y valida documento insoft.openapi-config (opcional). */
export function normalizeOpenApiConfig(raw: unknown): IsOpenApiConfig {
    if (!raw || typeof raw !== "object") throw new Error("openapi-config: documento inválido");
    const cfg = raw as IsOpenApiConfig;
    if (cfg.kind && cfg.kind !== OPENAPI_CONFIG_KIND) {
        throw new Error(`openapi-config: kind esperado «${OPENAPI_CONFIG_KIND}», recibido «${cfg.kind}»`);
    }
    if (!cfg.info?.title) throw new Error("openapi-config: info.title es requerido");
    if (!cfg.paths || typeof cfg.paths !== "object") throw new Error("openapi-config: paths es requerido");
    return prepareOpenApiConfig(cfg);
}

/**
 * Construye todos los artefactos exportables desde un único JSON insoft.openapi-config.
 * OpenAPI y Postman son formatos estándar; IS empaqueta viewer + spec para el visor InSoft.
 */
export function buildIssExportsFromConfig(raw: IsOpenApiConfig, opts: BuildIssExportsOpts = {}): IssExportsResult {
    const config = prepareOpenApiConfig(raw);
    const serverUrl = opts.serverUrl ?? config.protocol?.serverUrl ?? "/api";
    const apiBase = resolveApiBase(serverUrl, opts.absoluteBaseUrl);
    const openApi = buildOpenApiFromConfig(config, serverUrl) as Record<string, unknown>;
    const frontLink = opts.frontLink ?? (config.viewer as IssOpenApiViewerConfig)?.frontLinks?.[0] ?? null;
    const postman = openApiToPostmanCollection(openApi, {
        absoluteBaseUrl: opts.absoluteBaseUrl ?? apiBase,
        apiSummary: opts.apiSummary ?? config.info?.description ?? config.info?.title,
        frontLink,
    });
    const viewer = buildViewerRuntimeConfig(config, apiBase);
    const is = buildIsDocument(viewer, openApi);
    const embed = buildEmbedOpts(config, apiBase, viewer);
    return { config, openApi, postman, viewer, is, embed };
}
