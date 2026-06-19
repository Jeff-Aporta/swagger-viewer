/**
 * Arranque CDN — carga stack antes del chunk del visor (MaterialUI en globalThis).
 */
export async function bootSwaggerApp(config) {
  const merged = { ...(globalThis.__SWAGGER_CONFIG__ || {}), ...(config || {}) };
  const stackMod = await import(
    merged.stackUrl ||
      "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@main/cdn/stack.mjs",
  );
  await stackMod.stackReady;

  if (!globalThis.ISAFront?.registerApp) {
    await import(
      merged.isaUrl ||
        "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@main/cdn/isa/js/index.js",
    );
  }

  globalThis.ISAFront.registerApp({
    ns: merged.ns || "ISA",
    app: merged.app || "swagger-viewer",
    theme: true,
    session: false,
    auth: false,
    toast: true,
    feedback: true,
  });

  if (merged.shell !== false && !globalThis.ISAFront?.Layout?.AppShell) {
    const cdnBase = String(
      merged.stackUrl ||
        "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@main/cdn/stack.mjs",
    ).replace(/stack\.mjs$/i, "");
    if (!globalThis.Babel?.transform) {
      await new Promise((resolve, reject) => {
        if (globalThis.Babel?.transform) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.9/babel.min.js";
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("No se pudo cargar Babel standalone"));
        document.head.appendChild(s);
      });
    }
    const { loadSharedUi } = await import(cdnBase + "boot-helper.mjs");
    await loadSharedUi(globalThis.Babel);
  }

  if (globalThis.ISAFront?.registerCodeMirror && globalThis.React && globalThis.MaterialUI) {
    globalThis.ISAFront.registerCodeMirror(globalThis.React, globalThis.MaterialUI);
  }

  if (typeof globalThis.ISAFront?.ensureCodeMirrorLoaded === "function") {
    await globalThis.ISAFront.ensureCodeMirrorLoaded();
  }

  if (typeof marked === "undefined" && merged.loadMarked !== false) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js";
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar marked"));
      document.head.appendChild(s);
    });
  }

  if (merged.cssUrl) {
    await new Promise((resolve, reject) => {
      if (document.querySelector("[data-isa-sw-css]")) return resolve();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = merged.cssUrl;
      link.setAttribute("data-isa-sw-css", "1");
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("CSS swagger-viewer"));
      document.head.appendChild(link);
    });
  }

  const appUrl = merged.appUrl || "./swagger-viewer-app.min.js";
  const { mountSwaggerViewer } = await import(appUrl);
  return mountSwaggerViewer(merged, merged.root || "#root");
}

globalThis.ISAComponents = globalThis.ISAComponents || {};
globalThis.ISAComponents.Swagger = { bootSwaggerApp };

export { bootSwaggerApp as default };
