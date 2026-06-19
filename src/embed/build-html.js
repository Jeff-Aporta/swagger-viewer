/**
 * HTML mínimo para workers — carga swagger-viewer por CDN.
 * @param {object} opts
 * @param {string} opts.specUrl
 * @param {string} [opts.title]
 * @param {string} [opts.viewerRef] — pin jsDelivr Personal@ref
 * @param {string} [opts.frontSharedRef]
 * @param {object} [opts.config] — resto de __SWAGGER_CONFIG__
 */
export function buildSwaggerViewerHtml(opts) {
  const specUrl = opts.specUrl;
  const title = opts.title || "API";
  const viewerRef = opts.viewerRef || "main";
  const fsRef = opts.frontSharedRef || "main";
  const viewerBase = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/Personal@${viewerRef}/components/swagger/cdn`;
  const fsBase = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/front-shared@${fsRef}/cdn`;

  const config = {
    specUrl,
    ns: "ISA",
    app: "swagger-viewer",
    shell: true,
    cssUrl: `${viewerBase}/swagger-viewer.min.css`,
    stackUrl: `${fsBase}/stack.mjs`,
    isaUrl: `${fsBase}/isa/js/index.js`,
    auth: {
      enabled: true,
      loginUrl: opts.authLoginUrl || "https://system-login.jeffaporta.workers.dev",
    },
    brand: opts.brand || { title: opts.brandTitle || title, icon: opts.brandIcon || "mdi:api" },
    exports: opts.exports || {
      openApiUrl: specUrl,
      openApiDownloadName: "openapi.json",
      postmanUrl: opts.postmanUrl || specUrl.replace(/\.json$/i, "/postman.json"),
      postmanDownloadName: opts.postmanDownloadName || "collection.postman.json",
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
  <script defer src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>window.__SWAGGER_CONFIG__=${cfgJson};</script>
  <script type="module">
    import { bootSwaggerApp } from "${viewerBase}/swagger-viewer.min.js";
    await bootSwaggerApp();
  </script>
</body>
</html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
