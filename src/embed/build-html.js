/**
 * HTML mínimo para hosts (Azure Functions, workers) — boot @isa-components/swagger por CDN.
 * Mantener alineado con ISS-AyudasCPIA src/lib/openapi/openapi-boot-html.ts
 *
 * @param {object} opts
 * @param {string} opts.specUrl
 * @param {string} [opts.title]
 * @param {string} [opts.viewerRef] — pin jsDelivr swagger-viewer@ref
 * @param {string} [opts.frontSharedRef]
 * @param {string} [opts.viewerRepo] — default Jeff-Aporta/swagger-viewer
 * @param {string} [opts.localCdnBase] — ej. http://localhost:5502/api/swagger/cdn
 * @param {object} [opts.config] — resto de __SWAGGER_CONFIG__
 */
export function buildSwaggerViewerHtml(opts) {
  const specUrl = opts.specUrl;
  const title = opts.title || "API";
  const viewerRef = opts.viewerRef || "main";
  const fsRef = opts.frontSharedRef || "a5a6597";
  const viewerRepo = opts.viewerRepo || "Jeff-Aporta/swagger-viewer";
  const viewerBase = resolveViewerBase(specUrl, viewerRepo, viewerRef, opts.localCdnBase);
  const fsBase = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${fsRef}/cdn`;

  const authKind = opts.authKind || (opts.authLoginUrl ? "system-login" : "portal");
  const loginPath =
    opts.authLoginPath ||
    (authKind === "portal" ? "/api/auth/portal-login" : "/api/auth/test-token");

  const config = {
    specUrl,
    ns: "ISA",
    app: "swagger-viewer",
    shell: true,
    cssUrl: `${viewerBase}/swagger-viewer.min.css`,
    appUrl: `${viewerBase}/swagger-viewer-app.min.js`,
    stackUrl: `${fsBase}/stack.mjs`,
    isaUrl: `${fsBase}/isa/js/index.js`,
    auth: {
      enabled: opts.authEnabled !== false,
      loginUrl: opts.authLoginUrl || apiOriginFromSpecUrl(specUrl),
      loginKind: authKind,
      loginPath,
    },
    brand: opts.brand || { title: opts.brandTitle || title, icon: opts.brandIcon || "mdi:api" },
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

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)}</title>
  <meta name="application-name" content="${esc(config.brand.title)}"/>
  <meta name="app-icon" content="${esc(config.brand.icon)}"/>
  <meta name="app-theme-ls-key" content="jeffaporta:swagger-ui-theme"/>
  <link rel="stylesheet" href="${viewerBase}/swagger-viewer.min.css"/>
  <link rel="stylesheet" href="${fsBase}/isa/css/base.css"/>
  <script>
  (function () {
    var k = "jeffaporta:swagger-ui-theme";
    try { if (localStorage.getItem(k) === "light") return; } catch (e) {}
    document.documentElement.classList.add("dark-mode");
  })();
  </script>
  <script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.1",
    "react-dom": "https://esm.sh/react-dom@18.3.1",
    "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?external=react",
    "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
    "@emotion/react": "https://esm.sh/@emotion/react@11.14.0?external=react,react-dom",
    "@emotion/styled": "https://esm.sh/@emotion/styled@11.14.1?external=react,react-dom,@emotion/react",
    "@mui/material": "https://esm.sh/@mui/material@9.1.0?external=react,react-dom,@emotion/react,@emotion/styled",
    "@mui/material/": "https://esm.sh/@mui/material@9.1.0/"
  }
}
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.9/babel.min.js"></script>
  <script defer src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>window.__SWAGGER_CONFIG__=${cfgJson};</script>
  <script type="module">
    const _viewerUrl = "${viewerBase}/swagger-viewer.min.js";
    try {
      const { bootSwaggerApp } = await import(_viewerUrl);
      await bootSwaggerApp();
    } catch (e) {
      console.error("[swagger]", e);
      const root = document.getElementById("root");
      if (root) {
        root.innerHTML = "<p style=\\"padding:1.5rem;font-family:system-ui\\">No se pudo cargar el visor OpenAPI. "
          + "Comprueba la red o recarga la página.<br><small>" + String(e && e.message || e) + "</small></p>";
      }
    }
  </script>
</body>
</html>`;
}

/** HTML para GET /api/swagger — AyudasCP-IA y hosts similares. */
export function buildSwaggerUiHtml(openApiJsonUrl, opts = {}) {
  const frontLinks = opts.frontLinks?.length
    ? opts.frontLinks
    : opts.frontLinkKey && opts.frontLinksByKey?.[opts.frontLinkKey]
      ? [opts.frontLinksByKey[opts.frontLinkKey]]
      : [];
  return buildSwaggerViewerHtml({
    specUrl: openApiJsonUrl,
    title: opts.title || "API",
    viewerRef: opts.viewerRef,
    frontSharedRef: opts.frontSharedRef,
    viewerRepo: opts.viewerRepo,
    localCdnBase: opts.localCdnBase,
    authKind: opts.authKind || "portal",
    authLoginUrl: opts.authLoginUrl,
    brand: opts.brand || { title: "ISA PatyIA", icon: "mdi:robot-happy-outline" },
    postmanUrl: openApiJsonUrl.replace(/\/swagger\.json$/i, "/swagger/postman.json"),
    postmanDownloadName: opts.postmanDownloadName || "iss-ayudascpia.postman_collection.json",
    isUrl: openApiJsonUrl.replace(/\/swagger\.json$/i, "/swagger/is.json"),
    isDownloadName: opts.isDownloadName || "iss-ayudascpia.is.json",
    frontLinks,
  });
}

function resolveViewerBase(specUrl, viewerRepo, viewerRef, localCdnBase) {
  if (localCdnBase) return localCdnBase.replace(/\/$/, "");
  if (isLocalHostUrl(specUrl)) {
    return `${apiBaseFromSpecUrl(specUrl)}/swagger/cdn`;
  }
  return `https://cdn.jsdelivr.net/gh/${viewerRepo}@${viewerRef}/cdn`;
}

function apiBaseFromSpecUrl(specUrl) {
  return specUrl.replace(/\/swagger\.json\/?$/i, "");
}

function apiOriginFromSpecUrl(specUrl) {
  try {
    return new URL(specUrl).origin;
  } catch {
    return "";
  }
}

function isLocalHostUrl(url) {
  try {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
