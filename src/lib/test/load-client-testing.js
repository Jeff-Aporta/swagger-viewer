/**
 * Carga tests agnósticos desde el server (GET /system/testing.json).
 * Server solo provee datos — la ejecución es 100% en cliente.
 *
 * El visor obtiene los tests desde:
 *   1. apiBase + viewer.testingPath ("/system/testing.json" por defecto)
 *   2. fallback a `viewer.client.tests` embebido (legacy)
 */

const DEFAULT_TESTING_PATH = "/system/testing.json";

function resolveTestingUrl(apiBase, viewer, testingPath) {
    const base = String(apiBase || "").replace(/\/+$/, "");
    if (!base) return "";
    const path = testingPath
        || viewer?.testingPath
        || viewer?.swaggerPaths?.testing
        || DEFAULT_TESTING_PATH;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * @param {object} opts
 * @param {string} opts.apiBase
 * @param {object} [opts.viewer]
 * @param {string} [opts.testingPath]
 * @param {object} [opts.fallback]  // tests embebidos legacy
 * @param {() => string | null} [opts.getJwt]
 */
export async function loadClientTesting({
    apiBase,
    viewer,
    testingPath,
    fallback,
    getJwt,
}) {
    const url = resolveTestingUrl(apiBase, viewer, testingPath);
    if (!url) {
        return normalizeTests(fallback?.tests || fallback || []);
    }
    try {
        const headers = { Accept: "application/json" };
        const jwt = getJwt?.();
        if (jwt) headers.Authorization = `Bearer ${jwt}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
            // Si falla, no romper UI; caer al fallback embebido
            return normalizeTests(fallback?.tests || fallback || []);
        }
        const data = await res.json();
        return normalizeTests(data?.tests || []);
    } catch {
        return normalizeTests(fallback?.tests || fallback || []);
    }
}

/** Normaliza cada test al shape que `ClientTestTagGroup` espera. */
export function normalizeTests(tests) {
    if (!Array.isArray(tests)) return [];
    return tests
        .filter((t) => t && Array.isArray(t.steps) && t.steps.length > 0)
        .map((t) => ({
            id: t.id || t.name || "",
            title: t.title || t.name || t.id || "Test",
            description: t.description || "",
            docs: t.docs || "",
            tags: Array.isArray(t.tags) ? t.tags : [],
            subgroup: t.subgroup || "",
            steps: t.steps,
            source: t.source || (t.id ? "server" : "legacy"),
        }));
}

export { DEFAULT_TESTING_PATH };
