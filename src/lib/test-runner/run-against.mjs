#!/usr/bin/env node
/**
 * Runner contra el backend real — invoca runTest() y muestra el verdict.
 * Uso: node src/lib/test-runner/run-against.mjs <apiBase> [testId] [jwt]
 *      apiBase  ej. https://ayudascp-ia-staging.azurewebsites.net/api
 *      testId   default: title-change
 *      jwt      bearer opcional (default: lee ../Personal/apps/isa-patyia/dev-token.json
 *              o ../../PatyIA/ISS-AyudasCPIA/dev-token.json; sin JWT, solo
 *              funciona contra endpoints públicos; config conversación siempre vía GET público)
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTest, formatVerdict, loadConversacionConfigFromApi } from "./index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadJwt(explicit) {
    if (explicit) return explicit;
    // __dirname = .../Personal/apps/components/swagger/src/lib/test-runner/
    // 7 niveles arriba llega a C:/ContaPyme/ (la raíz del workspace).
    const root = join(__dirname, "..", "..", "..", "..", "..", "..", "..");
    const candidates = [
        join(root, "PatyIA", "ISS-AyudasCPIA", "dev-token.json"),
        join(root, "Personal", "apps", "isa-patyia", "dev-token.json"),
        join(root, "dev-token.json"),
    ];
    for (const f of candidates) {
        if (existsSync(f)) {
            try {
                const t = JSON.parse(readFileSync(f, "utf8"));
                return t.token || t.tokens?.JAGUDELOE?.token || "";
            } catch { /* ignore */ }
        }
    }
    return "";
}

const [, , apiBase, testIdArg, jwtArg] = process.argv;
if (!apiBase) {
    console.error("Uso: run-against <apiBase> [testId] [jwt]");
    process.exit(2);
}
const testId = testIdArg ?? "title-change";
const jwt = loadJwt(jwtArg);
if (jwt) console.log(`▶ JWT: ${jwt.slice(0, 24)}…`); else console.log("▶ sin JWT (modo público)");

const url = `${apiBase.replace(/\/$/, "")}/system/testing.json`;
console.log(`▶ GET ${url}`);
const res = await fetch(url, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} });
if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    process.exit(1);
}
const payload = await res.json();
const test = payload.tests.find((t) => t.id === testId) ?? payload.tests[0];
if (!test) {
    console.error(`Test '${testId}' no encontrado`);
    process.exit(1);
}
console.log(`▶ Test '${test.id}' (${test.title}) — ${test.steps.length} steps\n`);

const conversacionConfig = await loadConversacionConfigFromApi(apiBase);
console.log(`▶ Config conversación (GET público /system/config/conversacion): recalcularTituloCadaMensajesUsuario=${conversacionConfig.recalcularTituloCadaMensajesUsuario} [${conversacionConfig.source}]\n`);

const verdict = await runTest(test, {
    apiBase,
    jwt,
    stepDelayMs: 2000,
    onStep: (s) => {
        const tag = s.ok ? "✓" : "✗";
        const head = `  ${tag} [${String(s.index).padStart(2, "0")}] ${s.kind.padEnd(7)} ${Math.round(s.duration)}ms`;
        const desc = s.description ? `  ${s.description}` : "";
        const extra = s.kind === "conv"
            ? [
                s.iconversacion != null ? `iconv=${s.iconversacion}` : "(sin iconversacion)",
                s.titulo ? `titulo="${s.titulo}"` : "",
                s.titleChange ? `Δ ${s.titleChange.from ?? "(vacío)"} → ${s.titleChange.to}` : "",
                s.error ? `ERROR: ${s.error.slice(0, 100)}` : "",
            ].filter(Boolean).join("  ")
            : s.kind === "http" || s.kind === "raw"
            ? [s.status != null ? `status=${s.status}` : "", s.error ? `error=${s.error}` : ""].filter(Boolean).join("  ")
            : "";
        console.log(`${head}${desc}${extra ? `  ${extra}` : ""}`);
    },
});
console.log("\n" + formatVerdict(verdict, { verbose: true, color: true }));
process.exit(verdict.pass ? 0 : 1);