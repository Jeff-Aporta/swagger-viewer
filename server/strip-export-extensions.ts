/**
 * Quita extensiones InSoft/IS-Swagger del OpenAPI para export estándar (Swagger Editor, Postman).
 * El documento IS (insoft.swagger-viewer) conserva el spec completo con x-isa-* / x-iss-*.
 */
import {
    ISS_DOC_MD_EXTENSION,
    ISS_INPUT_RECOMMENDATION_EXTENSION,
    ISS_LIST_FILTER_EXTENSION,
    ISS_LOOKUP_EXTENSION,
    ISS_REQUEST_BODY_EXAMPLES_EXTENSION,
    ISS_SUBGROUP_EXTENSION,
    ISS_SUBGROUPS_EXTENSION,
    ISS_TRYIT_ATTACHMENTS_EXTENSION,
    ISS_CATALOG_DOC_KEYS_EXTENSION,
    ISS_ENUM_FROM_EXTENSION,
    ISS_ELEVATED_ONLY_EXTENSION,
} from "./spec.js";

const STRIP_KEYS = new Set([
    ISS_DOC_MD_EXTENSION,
    ISS_LOOKUP_EXTENSION,
    ISS_LIST_FILTER_EXTENSION,
    ISS_SUBGROUP_EXTENSION,
    ISS_SUBGROUPS_EXTENSION,
    ISS_REQUEST_BODY_EXAMPLES_EXTENSION,
    ISS_INPUT_RECOMMENDATION_EXTENSION,
    ISS_TRYIT_ATTACHMENTS_EXTENSION,
    ISS_CATALOG_DOC_KEYS_EXTENSION,
    ISS_ENUM_FROM_EXTENSION,
    ISS_ELEVATED_ONLY_EXTENSION,
    "tryitAttachments",
    "subgroups",
]);

function stripNode(value: unknown): unknown {
    if (value == null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(stripNode);
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (STRIP_KEYS.has(key)) continue;
        out[key] = stripNode(child);
    }
    return out;
}

/** OpenAPI 3 listo para herramientas estándar (sin metadatos del visor IS). */
export function stripIsaExtensionsForExport(openApi: Record<string, unknown>): Record<string, unknown> {
    return stripNode(openApi) as Record<string, unknown>;
}
