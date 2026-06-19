import { bootHelperUrl, ensureSwaggerViewerCss, demoAppUrl } from "./cdn.mjs";

async function boot() {
  if (new URLSearchParams(location.search).has("isa_boot_hold")) return;

  const { importShared, assertStack, loadSharedUi } = await import(bootHelperUrl);

  const stackMod = await importShared("stack.mjs");
  await stackMod.stackReady;
  assertStack();

  const Babel = globalThis.Babel;
  if (!Babel?.transform) throw new Error("Babel standalone no cargó");

  await importShared("isa/js/index.js");
  await loadSharedUi(Babel);

  window.ISAFront.registerApp({
    ns: "ISA",
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
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  if (root) {
    root.innerHTML = `<pre style="color:#ff8a80;padding:24px;font-family:monospace">Error de arranque:\n${msg}</pre>`;
  }
  console.error(err);
});
