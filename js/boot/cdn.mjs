/** Pin jsDelivr front-shared + rutas del paquete swagger-viewer. */
export const PIN = "release-2026-06-30";

const isDevHost =
  typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);

/** Demo embebido vía ISS (/api/swagger/demo). */
function isIssSwaggerDemoHost() {
  return typeof location !== "undefined" && /\/api\/swagger\/demo\/?/i.test(location.pathname);
}

/** Demo publicado en jeff-aporta.github.io/swagger-viewer. */
function isGhPagesSwaggerDemo() {
  return typeof location !== "undefined" && /github\.io$/i.test(location.hostname) && /\/swagger-viewer\/?/i.test(location.pathname);
}

function devCdnBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("../../front-shared/cdn/", base).href.replace(/\/?$/, "/");
}

function frontSharedCdn() {
  if (isIssSwaggerDemoHost()) return `${location.origin}/api/swagger/cdn/fs/`;
  if (isDevHost && !isGhPagesSwaggerDemo()) return devCdnBase();
  return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn`;
}

export const CDN = frontSharedCdn();

export const bootHelperUrl =
  isDevHost && !isIssSwaggerDemoHost() && !isGhPagesSwaggerDemo()
    ? `${CDN}boot-helper.mjs`
    : `${CDN.replace(/\/?$/, "/")}/boot-helper.mjs?v=${PIN}`;

/* @isa-swagger-boot:start */
/** Jeff-Aporta/swagger-viewer — pin CDN git (sync-component-refs.mjs) */
export const SWAGGER_VIEWER_REF = "cd45b28";

export function swaggerViewerBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isIssSwaggerDemoHost()) return `${location.origin}/api/swagger/cdn/`;
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
