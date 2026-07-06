#!/usr/bin/env node
/**
 * Regenera demo/openapi/sample.is.json a partir de schema/is-swagger.json
 * del repo PatyIA/ISS-AyudasCPIA (insoft.openapi-config → insoft.swagger-viewer).
 *
 * Uso:
 *   npx tsx scripts/regen-sample.mjs [ruta/a/is-swagger.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const cfgPath = process.argv[2] ?? "C:/ContaPyme/PatyIA/ISS-AyudasCPIA/schema/is-swagger.json";
const cfgAbs = resolve(cfgPath);
const raw = JSON.parse(readFileSync(cfgAbs, "utf8"));
if (raw?.kind !== "insoft.openapi-config") {
    console.error("[regen-sample] el JSON no es insoft.openapi-config — verifica la ruta:");
    console.error("  " + cfgPath);
    process.exit(2);
}

// Import TS source directamente (tsx loader está activo al invocar con `npx tsx`).
const { buildIssExportsFromConfig, normalizeOpenApiConfig } = await import("../server/build-exports.ts");
const norm = normalizeOpenApiConfig(raw);
const built = buildIssExportsFromConfig(norm, {
    authBase: "http://localhost:8802",
    apiPrefix: "/api",
    serverUrl: "/api",
    absoluteBaseUrl: "http://localhost:8802",
});
// El sample histórico es un IS Document plano: { kind, version, viewer, spec, ... }.
const out = {
    ...built.is,
    builtAt: new Date().toISOString(),
};
const target = join(root, "demo", "openapi", "sample.is.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2), "utf8");
console.log("[regen-sample] OK", target, "·", Object.keys(built.is?.spec?.paths ?? {}).length, "paths");
