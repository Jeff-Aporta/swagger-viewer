/** Marca AppShell — cada host define `config.brand` o meta `application-name` / `app-icon`. */

/** Sufijo fijo del `<title>` de pestaña: identifica el visor IS-Swagger de InSoft. */
export const IS_SWAGGER_TAB_SUFFIX = " | IS-Swagger";

/** `ISA RAG` → `ISA RAG | IS-Swagger` (sin duplicar si ya viene el sufijo). */
export function formatSwaggerDocumentTitle(appTitle) {
  const raw = String(appTitle ?? "").trim() || "API";
  if (raw === "IS-Swagger") return "IS-Swagger";
  if (raw.endsWith(IS_SWAGGER_TAB_SUFFIX)) return raw;
  return `${raw}${IS_SWAGGER_TAB_SUFFIX}`;
}

export function readBrandFromMeta() {
  const title = document.querySelector('meta[name="application-name"]')?.getAttribute("content")?.trim();
  const icon = document.querySelector('meta[name="app-icon"]')?.getAttribute("content")?.trim();
  return { title: title || undefined, icon: icon || undefined };
}

/** Prioridad: config.brand (brandLock ignora spec) → meta → spec.info.title → defaults. */
export function resolveViewerBrand(config, spec) {
  const meta = readBrandFromMeta();
  const from = config?.brand || {};
  const specTitle =
    config?.brandLock || config?.brandLocked
      ? ""
      : typeof spec?.info?.title === "string"
        ? spec.info.title.trim()
        : "";
  return {
    title: from.title || meta.title || specTitle || "API",
    icon: from.icon || meta.icon || "mdi:api",
  };
}

export function applyBrandToDocument(brand, { lockMeta } = {}) {
  if (!brand?.title) return;
  // Tab title siempre con sufijo IS-Swagger (aunque brandLock preserve meta).
  document.title = formatSwaggerDocumentTitle(brand.title);
  const appName = document.querySelector('meta[name="application-name"]');
  if (appName && !lockMeta) appName.setAttribute("content", brand.title);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && !lockMeta) ogTitle.setAttribute("content", formatSwaggerDocumentTitle(brand.title));
  if (brand.icon) {
    const appIcon = document.querySelector('meta[name="app-icon"]');
    if (appIcon && !lockMeta) appIcon.setAttribute("content", brand.icon);
  }
}
