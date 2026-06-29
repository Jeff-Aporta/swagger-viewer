/** Opciones enum de parámetros — schema.enum, x-iss-enum-from o claves catalog.docs en el spec. */

export const ISS_CATALOG_DOC_KEYS_EXTENSION = "x-iss-catalog-doc-keys";
export const ISS_ENUM_FROM_EXTENSION = "x-iss-enum-from";

const SWAGGER_DOC_KEY_PATH = /\/swagger\/docs\/\{key\}/i;

export function catalogDocKeysFromSpec(spec) {
  const keys = spec?.[ISS_CATALOG_DOC_KEYS_EXTENSION];
  return Array.isArray(keys) ? keys.map(String).filter(Boolean) : [];
}

export function catalogDocKeysFromSources(spec, catalogDocKeys) {
  if (Array.isArray(catalogDocKeys) && catalogDocKeys.length) return catalogDocKeys.map(String).filter(Boolean);
  const fromSpec = catalogDocKeysFromSpec(spec);
  if (fromSpec.length) return fromSpec;
  const docs = spec?.catalog?.docs;
  if (docs && typeof docs === "object" && !Array.isArray(docs)) return Object.keys(docs).sort();
  return [];
}

export function resolveParamEnumOptions(param, spec, opPath = "", catalogDocKeys = null) {
  const direct = param?.schema?.enum;
  if (Array.isArray(direct) && direct.length) return direct.map(String);
  const docKeys = catalogDocKeysFromSources(spec, catalogDocKeys);
  if (!docKeys.length) return null;
  const src = param?.[ISS_ENUM_FROM_EXTENSION];
  if (src === "catalog.docs") return docKeys;
  if (param?.name === "key" && SWAGGER_DOC_KEY_PATH.test(String(opPath || ""))) return docKeys;
  return null;
}

export function defaultParamEnumValue(param, spec, opPath = "", catalogDocKeys = null) {
  const opts = resolveParamEnumOptions(param, spec, opPath, catalogDocKeys);
  if (!opts?.length) return "";
  const ex = param?.schema?.example ?? param?.example;
  if (ex != null && String(ex).length && opts.includes(String(ex))) return String(ex);
  if (opts.includes("health")) return "health";
  return opts[0];
}
