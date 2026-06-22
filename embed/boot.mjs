/**
 * Arranque del visor OpenAPI embebido (hosts Azure / ISS).
 * Requiere window.__SWAGGER_CONFIG__ y swagger-viewer.min.js en viewerCdnBase.
 */

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

boot().catch((err) => {
  console.error("[swagger]", err);
  const root = document.getElementById("root");
  const msg = err instanceof Error ? err.message : String(err);
  if (root) {
    root.innerHTML =
      '<div style="padding:1.5rem;font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto">' +
      "<p><strong>No se pudo cargar el visor OpenAPI.</strong></p>" +
      `<p style="color:#64748b;font-size:0.9rem">${msg}</p>` +
      '<p style="color:#64748b;font-size:0.85rem">Comprueba la red o recarga la página.</p></div>';
  }
});
