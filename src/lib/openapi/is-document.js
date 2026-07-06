/** Documento IS InSoft — payload único para inyectar en SwaggerViewer (no OpenAPI ni Postman). */

export const IS_DOCUMENT_KIND = "insoft.swagger-viewer";
export const IS_DOCUMENT_VERSION = 1;

const RUNTIME_KEYS = new Set([
  "cssUrl",
  "stackUrl",
  "isaUrl",
  "appUrl",
  "specUrl",
  "url",
  "spec",
  "root",
  "exports",
  "loadMarked",
  "scopes",
]);

/** Config de vista sin URLs de arranque CDN ni spec embebido duplicado. */
export function viewerConfigFromBoot(config = {}) {
  const out = {};
  for (const [k, v] of Object.entries(config)) {
    if (RUNTIME_KEYS.has(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/** Arma el JSON IS que reconstruye la vista actual del visor. */
export function buildIsDocument(config, spec) {
  return {
    kind: IS_DOCUMENT_KIND,
    version: IS_DOCUMENT_VERSION,
    viewer: viewerConfigFromBoot(config),
    spec,
  };
}

/** Acepta documento IS o config con spec embebido. */
export function parseIsDocument(doc) {
  if (!doc || typeof doc !== "object") return null;
  if (doc.kind === IS_DOCUMENT_KIND && doc.spec && typeof doc.spec === "object") {
    const viewer = doc.viewer && typeof doc.viewer === "object" ? doc.viewer : {};
    return { config: { ...viewer, spec: doc.spec }, spec: doc.spec };
  }
  if (doc.spec && typeof doc.spec === "object" && !doc.paths) {
    return parseIsDocument(doc.spec);
  }
  return null;
}

export function isDocumentText(doc) {
  return JSON.stringify(doc, null, 2);
}
