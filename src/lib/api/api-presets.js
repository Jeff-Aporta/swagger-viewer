/**
 * ISS PatyIA — base API de conexión (hardcoded por petición del usuario).
 *
 * El visor demo NO debe quemar JSONs ni simular conexiones:
 * siempre consume desde una conn real (?conn= / ?api= / TextField en URL).
 *
 *  ISS_PATYIA_PRESETS    → entornos Local/Prod del botón "Conectar con ISS PatyIA"
 *  ISS_PATYIA_API_BASE   → compat: alias de Local (default del modal).
 */

export const ISS_PATYIA_API_BASE = "http://localhost:8802/api";

/** Modal "Conectar con ISS PatyIA" → elige entorno. */
export const ISS_PATYIA_PRESETS = [
    { id: "local", label: "Local", base: "http://localhost:8802/api", icon: "mdi:laptop", description: "ISS PatyIA dev (Functions / localhost)" },
    { id: "prod", label: "Producción", base: "https://ayudascp-ia-staging.azurewebsites.net/api", icon: "mdi:cloud-outline", description: "ISS PatyIA staging Azure" },
];

/** Compat: bases histórica ISS local / staging web (refs; no se exponen en UI principal). */
export const ISS_LOCAL_API_BASE = "http://127.0.0.1:8802/api";
export const ISS_WEB_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";

/** Scopes vacíos: el select "Otro" está prohibido — la conn siempre es por URL real. */
export const DEFAULT_API_SCOPES = [];