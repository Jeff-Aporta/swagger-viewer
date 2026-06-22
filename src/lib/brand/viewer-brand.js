/** Marca AppShell — cada host define `config.brand` o meta `application-name` / `app-icon`. */

export function readBrandFromMeta() {
  const title = document.querySelector('meta[name="application-name"]')?.getAttribute("content")?.trim();
  const icon = document.querySelector('meta[name="app-icon"]')?.getAttribute("content")?.trim();
  return { title: title || undefined, icon: icon || undefined };
}

/** Prioridad: config.brand → meta index.html → spec.info.title (solo título) → defaults. */
export function resolveViewerBrand(config, spec) {
  const meta = readBrandFromMeta();
  const from = config?.brand || {};
  const specTitle = typeof spec?.info?.title === "string" ? spec.info.title.trim() : "";
  return {
    title: from.title || meta.title || specTitle || "API",
    icon: from.icon || meta.icon || "mdi:api",
  };
}

export function applyBrandToDocument(brand) {
  if (!brand?.title) return;
  document.title = brand.title;
  const appName = document.querySelector('meta[name="application-name"]');
  if (appName) appName.setAttribute("content", brand.title);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", brand.title);
  if (brand.icon) {
    const appIcon = document.querySelector('meta[name="app-icon"]');
    if (appIcon) appIcon.setAttribute("content", brand.icon);
  }
}
