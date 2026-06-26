/** Bases API ISS — local dev y staging web (switch de contexto en visor/export). */

export const ISS_LOCAL_API_BASE = "http://127.0.0.1:8802/api";
export const ISS_WEB_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";

export const DEFAULT_API_SCOPES = [
  { id: "web", label: "Web (staging)", base: ISS_WEB_API_BASE, icon: "mdi:web" },
  { id: "local", label: "Local", base: ISS_LOCAL_API_BASE, icon: "mdi:laptop" },
];
