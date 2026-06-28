import { SwaggerViewer } from "./SwaggerViewer.jsx";
import { loadViewerDocument } from "./lib/openapi/openapi.js";
import { parseIsDocument } from "./lib/openapi/is-document.js";

/** @type {import('react-dom/client').Root | null} */
let _reactRoot = null;

export async function mountSwaggerViewer(config, target = "#root") {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) throw new Error("mountSwaggerViewer: contenedor no encontrado");

  const bootParsed = parseIsDocument(config);
  let viewerConfig = bootParsed ? bootParsed.config : config;
  let spec = bootParsed?.spec || viewerConfig.spec;

  if (!spec && (viewerConfig.specUrl || viewerConfig.url || viewerConfig.spec)) {
    const loaded = await loadViewerDocument(viewerConfig);
    viewerConfig = loaded.config;
    spec = loaded.spec;
  }
  if (!spec) throw new Error("mountSwaggerViewer: documento IS requerido");

  const createRoot = globalThis.ReactDOM?.createRoot;
  if (!createRoot) throw new Error("mountSwaggerViewer: ReactDOM.createRoot no disponible");

  const fixedServer = viewerConfig.fixedServer === true;
  if (!_reactRoot) _reactRoot = createRoot(el);
  _reactRoot.render(globalThis.React.createElement(SwaggerViewer, { config: viewerConfig, spec, fixedServer }));
  return { unmount: () => _reactRoot?.unmount?.() };
}

export { SwaggerViewer } from "./SwaggerViewer.jsx";
export { resolveViewerBrand, readBrandFromMeta, applyBrandToDocument } from "./lib/brand/viewer-brand.js";
