/** Bases API ISS — sincronizado con src/lib/api/api-presets.js */

export const ISS_LOCAL_API_BASE = "http://127.0.0.1:8802/api";
export const ISS_WEB_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";

export type ApiScopePreset = { id: string; label: string; base: string; icon?: string };

export const DEFAULT_API_SCOPES: ApiScopePreset[] = [
    { id: "web", label: "Web (staging)", base: ISS_WEB_API_BASE, icon: "mdi:web" },
    { id: "local", label: "Local", base: ISS_LOCAL_API_BASE, icon: "mdi:laptop" },
];

export function normApiBase(url: string): string {
    return String(url || "").replace(/\/$/, "");
}

export function buildOpenApiServers(activeBase: string): Array<{ url: string; description: string }> {
    const active = normApiBase(activeBase || ISS_WEB_API_BASE);
    const presets: Array<[string, string]> = [
        [active, "API activa (contexto actual)"],
        [ISS_LOCAL_API_BASE, "Local (ISS Functions)"],
        [ISS_WEB_API_BASE, "Web (staging Azure)"],
    ];
    const seen = new Set<string>();
    const out: Array<{ url: string; description: string }> = [];
    for (const [url, description] of presets) {
        const u = normApiBase(url);
        if (seen.has(u)) continue;
        seen.add(u);
        out.push({ url: u, description });
    }
    return out;
}
