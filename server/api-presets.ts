/**
 * ISS PatyIA — base API canónica (hardcoded por petición del usuario).
 *
 * El visor NO debe quemar JSONs: solo conexiones reales (?conn=, ?api=, TextField).
 * ISS_PATYIA_PRESETS → entornos (Local/Prod) del modal "Conectar con ISS PatyIA".
 *
 * DEFAULT_API_SCOPES = []: el select con presets y "Otro" está prohibido en
 * el demo; el visor solo se conecta por URL explícita (?conn= / ?api=).
 */

export const ISS_PATYIA_API_BASE = "http://localhost:8802/api";

/** Modal "Conectar con ISS PatyIA" → elige entorno. */
export const ISS_PATYIA_PRESETS: PatyIaEnvPreset[] = [
    { id: "local", label: "Local", base: "http://localhost:8802/api", icon: "mdi:laptop", description: "ISS PatyIA dev (Functions / localhost)" },
    { id: "prod", label: "Producción", base: "https://ayudascp-ia-staging.azurewebsites.net/api", icon: "mdi:cloud-outline", description: "ISS PatyIA staging Azure" },
];

export interface PatyIaEnvPreset {
    id: string;
    label: string;
    base: string;
    icon?: string;
    description?: string;
}

/** Compat histórica. */
export const ISS_LOCAL_API_BASE = "http://127.0.0.1:8802/api";
export const ISS_WEB_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";

export const DEFAULT_API_SCOPES: ApiScopePreset[] = [];

export interface ApiScopePreset {
    id: string;
    label: string;
    base: string;
    icon?: string;
}

/** Normaliza una URL base API: añade https:// si falta y garantiza sufijo /api. */
function normApiBase(url: string): string {
    let s = String(url ?? "").trim();
    if (!s) return "";
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    try {
        const u = new URL(s);
        let path = u.pathname.replace(/\/+$/, "");
        if (!path.endsWith("/api")) path = path ? `${path}/api` : "/api";
        u.pathname = path;
        u.search = "";
        u.hash = "";
        return `${u.origin}${u.pathname}`;
    } catch {
        return "";
    }
}

/** Servidores OpenAPI que expone el visor demo (compat histórico). */
export function buildOpenApiServers(activeBase: string): Array<{ url: string; description: string }> {
    const active = normApiBase(activeBase || ISS_WEB_API_BASE);
    const candidates: Array<[string, string]> = [
        [ISS_LOCAL_API_BASE, "Local (ISS Functions)"],
        [ISS_WEB_API_BASE, "Web (staging Azure)"],
    ];
    const out: Array<{ url: string; description: string }> = [];
    if (active) out.push({ url: active, description: "Activo" });
    for (const [base, desc] of candidates) {
        const u = normApiBase(base);
        if (!u || u === active) continue;
        out.push({ url: u, description: desc });
    }
    return out;
}