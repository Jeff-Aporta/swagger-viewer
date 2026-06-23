/**
 * HTML embebido para hosts (Azure Functions, workers) — visor 100 % CDN.
 * Plantilla: embed/index.html (mismo shell que isa-patyia).
 *
 * @param {object} opts
 * @param {string} opts.specUrl
 * @param {string} [opts.title]
 * @param {string} [opts.viewerRef] — versión pin (jsDelivr / vendor)
 * @param {string} [opts.frontSharedRef]
 * @param {string} [opts.localCdnBase] — ej. https://host/api/swagger/cdn
 * @param {string} [opts.viewerCdnBase] — alias de localCdnBase
 * @param {object} [opts.config] — resto de __SWAGGER_CONFIG__
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function moduleDir() {
  try {
    // CJS bundle (cdn/vendor/build-html.cjs)
    // eslint-disable-next-line no-undef
    if (typeof __dirname === "string") return __dirname;
  } catch {
    /* ignore */
  }
  return dirname(fileURLToPath(import.meta.url));
}

function loadHtmlTemplate() {
  const here = moduleDir();
  const tries = [
    join(here, "..", "embed-index.html"),
    join(here, "..", "..", "embed", "embed-index.html"),
    join(here, "..", "..", "embed", "index.html"),
  ];
  for (const p of tries) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error("embed/index.html no encontrado (cdn/embed-index.html)");
}

function loadViewerRef() {
  const here = moduleDir();
  const tries = [join(here, "..", "versions.json"), join(here, "..", "..", "cdn", "versions.json")];
  for (const p of tries) {
    if (!existsSync(p)) continue;
    const raw = JSON.parse(readFileSync(p, "utf8"));
    if (raw.componentRef) return String(raw.componentRef);
  }
  return "main";
}

const SWAGGER_VIEWER_REF = loadViewerRef();
const SWAGGER_FRONT_SHARED_REF = "99fb049";
const SWAGGER_VIEWER_GH_REPO = "Jeff-Aporta/swagger-viewer";

function swaggerViewerCdnJsdelivr(ref = SWAGGER_VIEWER_REF) {
  const pin = String(ref || SWAGGER_VIEWER_REF).replace(/^v/, "");
  return `https://cdn.jsdelivr.net/gh/${SWAGGER_VIEWER_GH_REPO}@${pin}/cdn`;
}

export function buildSwaggerViewerHtml(opts) {
  const HTML_TEMPLATE = loadHtmlTemplate();
  const specUrl = opts.specUrl;
  const title = opts.title || "API";
  const fsRef = opts.frontSharedRef || SWAGGER_FRONT_SHARED_REF;
  const hostCdnBase = opts.viewerCdnBase || opts.localCdnBase;
  const viewerBase = resolveViewerBase(specUrl, hostCdnBase, opts.viewerRef);
  const fsBase = resolveFrontSharedBase(viewerBase, hostCdnBase, fsRef);

  const authKind = opts.authKind || (opts.authLoginUrl ? "system-login" : "portal");
  const loginPath =
    opts.authLoginPath ||
    (authKind === "portal" ? "/api/auth/portal-login" : "/api/auth/test-token");

  const brand = opts.brand || { title: opts.brandTitle || title, icon: opts.brandIcon || "mdi:api" };
  const brandIcon = String(brand.icon || "mdi:api");
  const brandTitle = String(brand.title || title);
  const iconColor = encodeURIComponent("#1e90ff");
  const iconify = (size) =>
    `https://api.iconify.design/${brandIcon.replace(":", "/")}.svg?color=${iconColor}&width=${size}&height=${size}`;

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
      loginUrl: opts.authLoginUrl || apiOriginFromSpecUrl(specUrl),
      loginKind: authKind,
      loginPath,
    },
    brand,
    exports: opts.exports || {
      openApiUrl: specUrl,
      openApiDownloadName: "openapi.json",
      postmanUrl: opts.postmanUrl || specUrl.replace(/\/swagger\.json$/i, "/swagger/postman.json"),
      postmanDownloadName: opts.postmanDownloadName || "collection.postman.json",
      isUrl: opts.isUrl || specUrl.replace(/\/swagger\.json$/i, "/swagger/is.json"),
      isDownloadName: opts.isDownloadName || "api.is.json",
    },
    frontLinks: opts.frontLinks || [],
    ...(opts.config || {}),
  };

  const cfgJson = JSON.stringify(config).replace(/</g, "\\u003c");
  const themeKey = "jeffaporta:swagger-ui-theme";
  const description =
    opts.description ||
    `Documentación interactiva IS-Swagger — ${brandTitle}. Try it out, export Postman y JSON IS.`;

  return HTML_TEMPLATE.replaceAll("__TITLE__", esc(title))
    .replaceAll("__DESCRIPTION__", esc(description))
    .replaceAll("__APP_NAME__", esc(brandTitle))
    .replaceAll("__APP_ICON__", esc(brandIcon))
    .replaceAll("__THEME_LS_KEY__", themeKey)
    .replaceAll("__FRONT_SHARED_BASE__", fsBase)
    .replaceAll("__VIEWER_CSS__", `${viewerBase}/swagger-viewer.min.css`)
    .replaceAll("__BOOT_MODULE__", `${viewerBase}/embed-boot.mjs`)
    .replaceAll("__BOOT_LABEL__", esc(`Cargando ${brandTitle}…`))
    .replaceAll("__OG_IMAGE__", iconify(512))
    .replaceAll("__FAVICON__", iconify(32))
    .replaceAll("__APPLE_ICON__", iconify(180))
    .replaceAll("__CONFIG_JSON__", cfgJson);
}

/** HTML para GET /api/swagger — carga documento IS desde /api/swagger/is.json (BD). */
export function buildSwaggerUiHtml(documentUrl, opts = {}) {
  const frontLinks = opts.frontLinks?.length
    ? opts.frontLinks
    : opts.frontLinkKey && opts.frontLinksByKey?.[opts.frontLinkKey]
      ? [opts.frontLinksByKey[opts.frontLinkKey]]
      : [];
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
    postmanUrl: opts.postmanUrl || String(documentUrl).replace(/\/swagger\/is\.json$/i, "/swagger/postman.json"),
    postmanDownloadName: opts.postmanDownloadName || "iss-ayudascpia.postman_collection.json",
    isUrl: opts.isUrl || documentUrl,
    isDownloadName: opts.isDownloadName || "iss-ayudascpia.is.json",
    frontLinks,
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

function apiOriginFromSpecUrl(specUrl) {
  try {
    return new URL(specUrl).origin;
  } catch {
    return "";
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
