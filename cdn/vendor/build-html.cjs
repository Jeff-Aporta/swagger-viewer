var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// components/swagger/src/embed/build-html.js
var build_html_exports = {};
__export(build_html_exports, {
  buildSwaggerUiHtml: () => buildSwaggerUiHtml,
  buildSwaggerViewerHtml: () => buildSwaggerViewerHtml
});
module.exports = __toCommonJS(build_html_exports);
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_url = require("node:url");

// components/front-shared/cdn/isa/js/core/config/constants.js
var MAIN_ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
var FRONT_SHARED_REF = "99fb049";
var CDN_BASE = "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@" + FRONT_SHARED_REF + "/cdn/isa";
var UI_CDN_BASE = "https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@" + FRONT_SHARED_REF + "/cdn/ui";
var FEEDBACK_CSS_URL = CDN_BASE + "/css/feedback.css";
var CODEMIRROR_VERSION = "5.65.18";
var CODEMIRROR_CDN = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/" + CODEMIRROR_VERSION;

// components/swagger/src/lib/auth/orchestrator-base.js
function resolveOrchestratorBase(_apiBase) {
  return MAIN_ORCHESTRATOR_URL_PROD;
}

// components/swagger/src/embed/build-html.js
var import_meta = {};
function moduleDir() {
  try {
    if (typeof __dirname === "string") return __dirname;
  } catch {
  }
  return (0, import_node_path.dirname)((0, import_node_url.fileURLToPath)(import_meta.url));
}
function loadHtmlTemplate() {
  const here = moduleDir();
  const tries = [
    (0, import_node_path.join)(here, "..", "embed-index.html"),
    (0, import_node_path.join)(here, "..", "..", "embed", "embed-index.html"),
    (0, import_node_path.join)(here, "..", "..", "embed", "index.html")
  ];
  for (const p of tries) {
    if ((0, import_node_fs.existsSync)(p)) return (0, import_node_fs.readFileSync)(p, "utf8");
  }
  throw new Error("embed/index.html no encontrado (cdn/embed-index.html)");
}
function loadViewerRef() {
  const here = moduleDir();
  const tries = [(0, import_node_path.join)(here, "..", "versions.json"), (0, import_node_path.join)(here, "..", "..", "cdn", "versions.json")];
  for (const p of tries) {
    if (!(0, import_node_fs.existsSync)(p)) continue;
    const raw = JSON.parse((0, import_node_fs.readFileSync)(p, "utf8"));
    if (raw.componentRef) return String(raw.componentRef);
  }
  return "main";
}
var SWAGGER_VIEWER_REF = loadViewerRef();
var SWAGGER_FRONT_SHARED_REF = "99fb049";
var SWAGGER_VIEWER_GH_REPO = "Jeff-Aporta/swagger-viewer";
function swaggerViewerCdnJsdelivr(ref = SWAGGER_VIEWER_REF) {
  const pin = String(ref || SWAGGER_VIEWER_REF).replace(/^v/, "");
  return `https://cdn.jsdelivr.net/gh/${SWAGGER_VIEWER_GH_REPO}@${pin}/cdn`;
}
function buildSwaggerViewerHtml(opts) {
  const HTML_TEMPLATE = loadHtmlTemplate();
  const specUrl = opts.specUrl;
  const title = opts.title || "API";
  const fsRef = opts.frontSharedRef || SWAGGER_FRONT_SHARED_REF;
  const hostCdnBase = opts.viewerCdnBase || opts.localCdnBase;
  const viewerBase = resolveViewerBase(specUrl, hostCdnBase, opts.viewerRef);
  const fsBase = resolveFrontSharedBase(viewerBase, hostCdnBase, fsRef);
  const authKind = opts.authKind || (opts.authLoginUrl ? "system-login" : "portal");
  const loginPath = opts.authLoginPath || "/api/auth/token";
  const brand = opts.brand || { title: opts.brandTitle || title, icon: opts.brandIcon || "mdi:api" };
  const brandIcon = String(brand.icon || "mdi:api");
  const brandTitle = String(brand.title || title);
  const iconColor = encodeURIComponent("#1e90ff");
  const iconify = (size) => `https://api.iconify.design/${brandIcon.replace(":", "/")}.svg?color=${iconColor}&width=${size}&height=${size}`;
  const config = {
    specUrl,
    ns: opts.ns || "ISA",
    app: opts.app || "swagger-viewer",
    shell: opts.shell !== false,
    viewerCdnBase: viewerBase,
    cssUrl: `${viewerBase}/swagger-viewer.min.css`,
    appUrl: `${viewerBase}/swagger-viewer-app.min.js`,
    stackUrl: `${fsBase}/stack.mjs`,
    isaUrl: `${fsBase}/_dist/isa/js/index.min.js`,
    auth: {
      enabled: opts.authEnabled !== false,
      loginUrl: opts.authLoginUrl || resolveOrchestratorBase(specUrl),
      loginKind: authKind,
      loginPath
    },
    brand,
    exports: opts.exports || {
      openApiDownloadName: "openapi.json",
      postmanDownloadName: "collection.postman.json",
      isDownloadName: "api.is.json"
    },
    frontLinks: opts.frontLinks || [],
    ...opts.config || {}
  };
  const cfgJson = JSON.stringify(config).replace(/</g, "\\u003c");
  const themeKey = "jeffaporta:swagger-ui-theme";
  const description = opts.description || `Documentaci\xF3n interactiva IS-Swagger \u2014 ${brandTitle}. Try it out, export Postman y JSON IS.`;
  return HTML_TEMPLATE.replaceAll("__TITLE__", esc(title)).replaceAll("__DESCRIPTION__", esc(description)).replaceAll("__APP_NAME__", esc(brandTitle)).replaceAll("__APP_ICON__", esc(brandIcon)).replaceAll("__THEME_LS_KEY__", themeKey).replaceAll("__FRONT_SHARED_BASE__", fsBase).replaceAll("__VIEWER_CSS__", `${viewerBase}/swagger-viewer.min.css`).replaceAll("__BOOT_MODULE__", `${viewerBase}/embed-boot.mjs`).replaceAll("__BOOT_LABEL__", esc(`Cargando ${brandTitle}\u2026`)).replaceAll("__OG_IMAGE__", iconify(512)).replaceAll("__FAVICON__", iconify(32)).replaceAll("__APPLE_ICON__", iconify(180)).replaceAll("__CONFIG_JSON__", cfgJson);
}
function buildSwaggerUiHtml(documentUrl, opts = {}) {
  const frontLinks = opts.frontLinks?.length ? opts.frontLinks : opts.frontLinkKey && opts.frontLinksByKey?.[opts.frontLinkKey] ? [opts.frontLinksByKey[opts.frontLinkKey]] : [];
  return buildSwaggerViewerHtml({
    specUrl: documentUrl,
    title: opts.title || "API",
    viewerRef: opts.viewerRef,
    frontSharedRef: opts.frontSharedRef,
    localCdnBase: opts.localCdnBase || opts.viewerCdnBase,
    authKind: opts.authKind || "portal",
    authLoginUrl: opts.authLoginUrl,
    authLoginPath: opts.authLoginPath,
    ns: opts.ns,
    app: opts.app,
    shell: opts.shell,
    exports: opts.exports,
    brand: opts.brand || { title: "ISS PatyIA", icon: "mdi:robot-happy-outline" },
    postmanDownloadName: opts.postmanDownloadName || "iss-ayudascpia.postman_collection.json",
    isDownloadName: opts.isDownloadName || "iss-ayudascpia.is.json",
    frontLinks
  });
}
function resolveFrontSharedBase(viewerBase, hostCdnBase, fsRef) {
  if (hostCdnBase) return `${String(viewerBase).replace(/\/$/, "")}/fs`;
  return `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${fsRef}/cdn`;
}
function resolveViewerBase(specUrl, localCdnBase, viewerRef) {
  if (localCdnBase) return String(localCdnBase).replace(/\/$/, "");
  if (viewerRef && viewerRef !== "main") {
    return swaggerViewerCdnJsdelivr(viewerRef);
  }
  return swaggerViewerCdnJsdelivr(SWAGGER_VIEWER_REF);
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSwaggerUiHtml,
  buildSwaggerViewerHtml
});
