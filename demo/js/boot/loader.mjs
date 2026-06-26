import { bootHelperUrl, ensureSwaggerViewerCss, demoAppUrl } from "./cdn.mjs";
import { showBootError } from "./boot-error.mjs";

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

boot().catch((err) => showBootError(err, { ns: "ISS" }));
