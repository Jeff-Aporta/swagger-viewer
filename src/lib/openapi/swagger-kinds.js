/** Kinds atómicos SYS_VALUES (jul 2026) + legacy pre-rename. Espejo de ISS swagger-config.ts */
export const OPENAPI_CONFIG_KIND = "config";
export const OPENAPI_META_KIND = "meta";
export const LEGACY_OPENAPI_CONFIG_KIND = "insoft.openapi-config";
export const LEGACY_OPENAPI_META_KIND = "insoft.openapi-meta";

export function isSwaggerConfigKind(kind) {
  return kind === OPENAPI_CONFIG_KIND || kind === LEGACY_OPENAPI_CONFIG_KIND;
}

export function isSwaggerMetaKind(kind) {
  return kind === OPENAPI_META_KIND || kind === LEGACY_OPENAPI_META_KIND;
}
