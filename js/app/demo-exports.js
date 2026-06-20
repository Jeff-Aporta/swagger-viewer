/** URLs blob para export OpenAPI/Postman en el demo (sin backend). */

export function buildMinimalPostmanCollection(spec) {
  const paths = spec?.paths || {};
  const items = [];
  for (const [path, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object") continue;
    for (const [method, op] of Object.entries(methods)) {
      if (!op || typeof op !== "object" || method === "parameters") continue;
      items.push({
        name: op.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [{ key: "Accept", value: "application/json" }],
          url: `{{base_url}}${path}`,
        },
      });
    }
  }
  return {
    info: {
      name: spec?.info?.title || "API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
    variable: [{ key: "base_url", value: String(spec?.servers?.[0]?.url || "").replace(/\/$/, "") }],
  };
}

/** Genera openApiUrl/postmanUrl locales revocables. */
export function buildDemoExportUrls(spec, names = {}) {
  const openApiText = JSON.stringify(spec, null, 2);
  const openApiUrl = URL.createObjectURL(new Blob([openApiText], { type: "application/json;charset=utf-8" }));
  const postmanText = JSON.stringify(buildMinimalPostmanCollection(spec), null, 2);
  const postmanUrl = URL.createObjectURL(new Blob([postmanText], { type: "application/json;charset=utf-8" }));
  return {
    openApiUrl,
    postmanUrl,
    openApiDownloadName: names.openApiDownloadName || "openapi.json",
    postmanDownloadName: names.postmanDownloadName || "iss-ayudascpia.postman_collection.json",
    isDownloadName: names.isDownloadName || "iss-ayudascpia.is.json",
    revoke: [openApiUrl, postmanUrl],
  };
}

export function revokeDemoExportUrls(urls) {
  for (const u of urls || []) {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  }
}
