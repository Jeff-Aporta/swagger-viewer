/**
 * Arranque IS-Swagger embebido (hosts Azure / ISS).
 * Requiere window.__SWAGGER_CONFIG__ y swagger-viewer.min.js en viewerCdnBase.
 */
import { showBootError } from "../demo/js/boot/boot-error.mjs";

const JSDELIVR_CDN = "https://cdn.jsdelivr.net/gh/Jeff-Aporta/swagger-viewer@0.1.18/cdn";

function viewerCdnBase(cfg) {
  const fromCfg = String(cfg?.viewerCdnBase || "").replace(/\/$/, "");
  if (fromCfg) return fromCfg;
  return JSDELIVR_CDN;
}

function cdnBaseUrl(cfg) {
  return `${viewerCdnBase(cfg).replace(/\/$/, "")}/`;
}

async function boot() {
  const cfg = { ...(globalThis.__SWAGGER_CONFIG__ || {}) };
  const base = cdnBaseUrl(cfg);
  const viewerUrl = `${base}swagger-viewer.min.js`;

  const mod = await import(viewerUrl);
  const bootSwaggerApp = mod.bootSwaggerApp || mod.default;
  if (typeof bootSwaggerApp !== "function") {
    throw new Error("swagger-viewer.min.js no exporta bootSwaggerApp");
  }

  await bootSwaggerApp({
    ...cfg,
    cssUrl: cfg.cssUrl || `${base}swagger-viewer.min.css`,
    appUrl: cfg.appUrl || `${base}swagger-viewer-app.min.js`,
  });
}

boot().catch((err) => showBootError(err, { headline: "No se pudo cargar IS-Swagger" }));
