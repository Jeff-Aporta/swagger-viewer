import { bootHelperUrl, ensureSwaggerViewerCss, demoAppUrl } from "./cdn.mjs";

async function boot() {
  if (new URLSearchParams(location.search).has("isa_boot_hold")) return;

  const { importShared, assertStack, loadSharedUi, loadIsaFront } = await import(bootHelperUrl);

  const stackMod = await importShared("stack.mjs");
  await stackMod.stackReady;
  if (typeof globalThis.ReactDOM?.createPortal !== "function") {
    const domMod = await import("react-dom");
    const dom = domMod.default ?? domMod;
    globalThis.ReactDOM = { ...globalThis.ReactDOM, createPortal: dom.createPortal.bind(dom) };
  }
  assertStack();

  const Babel = globalThis.Babel;
  if (!Babel?.transform) throw new Error("Babel standalone no cargó");

  await loadIsaFront();
  await loadSharedUi(Babel);

  window.ISAFront.registerApp({
    ns: "ISS",
    app: "swagger-viewer-demo",
    theme: true,
    session: false,
    auth: false,
    toast: true,
    feedback: true,
  });

  if (window.ISAFront?.registerCodeMirror && window.React && window.MaterialUI) {
    window.ISAFront.registerCodeMirror(window.React, window.MaterialUI);
  }

  if (typeof window.ISAFront?.ensureCodeMirrorLoaded === "function") {
    await window.ISAFront.ensureCodeMirrorLoaded({ sql: false });
  }

  await ensureSwaggerViewerCss();

  if (!document.querySelector('script[src*="marked"]')) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js";
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("marked"));
      document.head.appendChild(s);
    });
  }

  await import(demoAppUrl());
}

boot().catch((err) => {
  const root = document.getElementById("root");
  const msg = err instanceof Error ? err.message : String(err);
  if (root) {
    root.innerHTML = `<div style="max-width:560px;margin:48px auto;padding:24px;font-family:system-ui,sans-serif;color:#e8eef5;text-align:center">
      <p style="font-size:1.1rem;font-weight:600;margin:0 0 12px">No se pudo iniciar IS-Swagger</p>
      <p style="color:#ff8a80;margin:0 0 16px;font-size:0.9rem">${msg.replace(/</g, "&lt;")}</p>
      <button type="button" onclick="location.reload()" style="cursor:pointer;padding:8px 16px;border-radius:8px;border:1px solid #1e90ff;background:transparent;color:#1e90ff">Reintentar</button>
    </div>`;
  }
  console.error(err);
});
