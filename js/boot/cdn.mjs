/** Pin jsDelivr front-shared + rutas del paquete swagger-viewer. */
export const PIN = "a5a6597";

const isDevHost =
  typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);

function devCdnBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("../../front-shared/cdn/", base).href.replace(/\/?$/, "/");
}

export const CDN = isDevHost
  ? devCdnBase()
  : `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn`;

export const bootHelperUrl = isDevHost
  ? `${CDN}boot-helper.mjs`
  : `${CDN}/boot-helper.mjs?v=${PIN}`;

/* @isa-swagger-boot:start */
/** @jeff-aporta/is-swagger — versión npm (sync build → cdn/versions.json) */
export const SWAGGER_VIEWER_REF = "0.1.5";

export function swaggerViewerBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isDevHost) {
    return new URL("../../../components/swagger/cdn/", base).href.replace(/\/?$/, "/");
  }
  return new URL("cdn/", base).href.replace(/\/?$/, "/");
}

function ensureSwaggerStylesheet(href) {
  if (document.querySelector("[data-isa-sw-css]")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-isa-sw-css", "1");
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("No se pudo cargar " + href));
    document.head.appendChild(link);
  });
}

export async function ensureSwaggerViewerCss(base = swaggerViewerBase()) {
  const b = base.endsWith("/") ? base : base + "/";
  await ensureSwaggerStylesheet(b + "swagger-viewer.min.css");
  return b;
}

export async function ensureSwaggerViewer(base = swaggerViewerBase()) {
  const b = await ensureSwaggerViewerCss(base);
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    await import(b + "swagger-viewer.min.js");
  }
  if (!globalThis.ISAComponents?.Swagger?.bootSwaggerApp) {
    throw new Error("Swagger no registró ISAComponents.Swagger");
  }
  return globalThis.ISAComponents.Swagger;
}
/* @isa-swagger-boot:end */

export function demoAppUrl() {
  const base = document.querySelector("base")?.href || location.href;
  if (globalThis.__ISA_DIST__) {
    return new URL("_dist/app.min.js", base).href;
  }
  return new URL("js/app/main.jsx", base).href;
}
