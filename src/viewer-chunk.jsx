import { SwaggerViewer } from "./SwaggerViewer.jsx";
import { loadSpec } from "./lib/openapi.js";

/** @type {import('react-dom/client').Root | null} */
let _reactRoot = null;

export async function mountSwaggerViewer(config, target = "#root") {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) throw new Error("mountSwaggerViewer: contenedor no encontrado");

  const spec = config.spec || (config.specUrl || config.url ? await loadSpec(config) : null);
  if (!spec) throw new Error("mountSwaggerViewer: spec o specUrl requerido");

  const createRoot = globalThis.ReactDOM?.createRoot;
  if (!createRoot) throw new Error("mountSwaggerViewer: ReactDOM.createRoot no disponible");

  if (!_reactRoot) _reactRoot = createRoot(el);
  _reactRoot.render(globalThis.React.createElement(SwaggerViewer, { config, spec }));
  return { unmount: () => _reactRoot?.unmount?.() };
}

export { SwaggerViewer };
