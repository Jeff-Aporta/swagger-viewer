/** Pin jsDelivr front-shared + rutas del paquete swagger-viewer. */
export const PIN = "99fb049";

/** Demo embebido vía ISS (/api/swagger/demo). */
function isIssSwaggerDemoHost() {
  return typeof location !== "undefined" && /\/api\/swagger\/demo\/?/i.test(location.pathname);
}

/** Demo publicado en jeff-aporta.github.io/swagger-viewer. */
function isGhPagesSwaggerDemo() {
  return typeof location !== "undefined" && /github\.io$/i.test(location.hostname) && /\/swagger-viewer\/?/i.test(location.pathname);
}

function isLocalDevHost() {
  return typeof location !== "undefined" && /localhost|127\.0\.0\.1|\[::1\]/.test(location.hostname);
}

function devMonorepoCdnBase() {
  const base = document.querySelector("base")?.href || location.href;
  return new URL("../../front-shared/cdn/", base).href.replace(/\/?$/, "/");
}

function frontSharedCdn() {
  if (isIssSwaggerDemoHost()) return `${location.origin}/api/swagger/cdn/fs/`;
  if (isLocalDevHost() && !isGhPagesSwaggerDemo()) return devMonorepoCdnBase();
  return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${PIN}/cdn`;
}

export const CDN = frontSharedCdn();

function joinCdn(path) {
  const base = CDN.replace(/\/+$/, "");
  const rel = String(path || "").replace(/^\/+/, "");
  return rel ? `${base}/${rel}` : base;
}

export const bootHelperUrl =
  isLocalDevHost() && !isIssSwaggerDemoHost() && !isGhPagesSwaggerDemo()
    ? joinCdn("boot-helper.mjs")
    : `${joinCdn("boot-helper.mjs")}?v=${PIN}`;

/* @isa-swagger-boot:start */
/** Jeff-Aporta/swagger-viewer — pin CDN git (sync-component-refs.mjs) */
export const SWAGGER_VIEWER_REF = "073b350";

export function swaggerViewerBase() {
  const base = document.querySelector("base")?.href || location.href;
  if (isIssSwaggerDemoHost()) return `${location.origin}/api/swagger/cdn/`;
  if (isLocalDevHost() && !isGhPagesSwaggerDemo()) {
    return new URL("../cdn/", base).href.replace(/\/?$/, "/");
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
