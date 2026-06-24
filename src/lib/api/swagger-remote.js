/** Construye IS / OpenAPI / Postman en el cliente desde GET /swagger/config.json (GH Pages). */

import { buildIssExportsFromConfig } from "../../../cdn/iss-exports.browser.mjs";
import { fetchRemoteOpenApiConfig } from "./swagger-api.js";
import { parseIsDocument } from "../openapi/is-document.js";

export async function fetchRemoteIsDocument(apiBase) {
  const { doc: rawConfig, urls } = await fetchRemoteOpenApiConfig(apiBase);
  let built;
  try {
    built = buildIssExportsFromConfig(rawConfig, { absoluteBaseUrl: urls.apiBase });
  } catch (e) {
    throw new Error(`No se pudo generar OpenAPI/IS desde la config: ${e?.message || e}`);
  }
  if (!built?.is) throw new Error("La config no produjo documento IS (revisar paths y viewer en SYSTEM.swagger).");
  const parsed = parseIsDocument(built.is);
  if (!parsed?.spec) throw new Error("Documento IS inválido: falta spec OpenAPI embebido.");
  return { doc: built.is, urls, built };
}
