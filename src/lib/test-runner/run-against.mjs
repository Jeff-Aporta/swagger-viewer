#!/usr/bin/env node
/**
 * Runner contra el backend real — invoca runTest() y muestra el verdict.
 *
 * Uso:
 *   node src/lib/test-runner/run-against.mjs <apiBase> [testId] [jwt]
 *   node src/lib/test-runner/run-against.mjs <apiBase> [testId] [jwt] [--jwt-override=<token>]
 *
 *   apiBase        ej. https://ayudascp-ia-staging.azurewebsites.net/api
 *   testId         default: instrucciones-vs-modelo-exhaustivo
 *   jwt            bearer opcional (default: lee dev-token.json)
 *   --jwt-override=<token>  token explícito por apiRef "default" (para tests con jwtRef="override")
 *
 * Sin JWT, solo funciona contra endpoints públicos. El runner detecta multi-server
 * vía `requires.apis` y `step.apiRef` en el test.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTest, formatVerdict, loadConversacionConfigFromApi } from "./index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadJwt(explicit) {
    if (explicit) return explicit;
    const root = join(__dirname, "..", "..", "..", "..", "..", "..", "..");
    const candidates = [
        join(root, "PatyIA", "ISS-AyudasCPIA", "dev-token.json"),
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

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
    args
        .filter((a) => a.startsWith("--"))
        .map((a) => {
            const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
            return m ? [m[1], m[2] ?? true] : [a, true];
        }),
);

const [apiBase, testIdArg, jwtArg] = positional;
if (!apiBase) {
    console.error("Uso: run-against <apiBase> [testId] [jwt] [--jwt-override=<token>]");
    process.exit(2);
}
const testId = testIdArg ?? "instrucciones-vs-modelo-exhaustivo";
const loginJwt = loadJwt(jwtArg);
const jwtOverride = typeof flags["jwt-override"] === "string" ? flags["jwt-override"] : "";
// Compose jwt per-apiRef. Default = login JWT. Override = explicit token.
const jwtMap = { default: jwtOverride || loginJwt || "" };
if (jwtMap.default) console.log(`▶ JWT default: ${jwtMap.default.slice(0, 24)}…`);
else console.log("▶ sin JWT (modo público)");

const url = `${apiBase.replace(/\/$/, "")}/system/testing.json`;
console.log(`▶ GET ${url}`);
const res = await fetch(url, { headers: jwtMap.default ? { Authorization: `Bearer ${jwtMap.default}` } : {} });
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
const stepsCount = Array.isArray(test.steps) ? test.steps.length : 0;
const casesCount = Array.isArray(test.cases) ? test.cases.length : 0;
console.log(`▶ Test '${test.id}' (${test.title}) — steps=${stepsCount}${casesCount ? ` cases=${casesCount}` : ""}\n`);

const conversacionConfig = await loadConversacionConfigFromApi(apiBase);
console.log(`▶ Config conversación (GET público /system/config/conversacion): recalcularTituloCadaMensajesUsuario=${conversacionConfig.recalcularTituloCadaMensajesUsuario} [${conversacionConfig.source}]\n`);

const verdict = await runTest(test, {
    apiBase,
    apis: { default: apiBase },
    jwt: jwtMap,
    stepDelayMs: 2000,
    onStep: (s, ctx, caseRef) => {
        const tag = s.ok ? "✓" : "✗";
        const head = `  ${tag} [${String(s.index).padStart(2, "0")}] ${String(s.kind).padEnd(7)} ${Math.round(s.duration)}ms`;
        const desc = s.description ? `  ${s.description}` : "";
        const extra = s.kind === "stream" || s.kind === "conv"
            ? [
                s.output?.iconversacion != null ? `iconv=${s.output.iconversacion}` : "(sin iconversacion)",
                s.output?.titulo ? `titulo="${s.output.titulo}"` : "",
                s.error ? `ERROR: ${s.error.slice(0, 100)}` : "",
            ].filter(Boolean).join("  ")
            : s.kind === "http" || s.kind === "raw"
            ? [s.status != null ? `status=${s.status}` : "", s.error ? `error=${s.error}` : ""].filter(Boolean).join("  ")
            : s.kind === "script"
            ? [s.verdict?.pass != null ? (s.verdict.pass ? "PASS" : "FAIL") : "", s.error ? `error=${s.error}` : ""].filter(Boolean).join("  ")
            : "";
        const caseTag = caseRef ? `  <case=${caseRef.id}>` : "";
        console.log(`${head}${desc}${caseTag}${extra ? `  ${extra}` : ""}`);
    },
});

console.log("\n" + formatVerdict(verdict, { verbose: true, color: true }));
if (Array.isArray(verdict.cases) && verdict.cases.length) {
    console.log("\n── Resumen por caso ──");
    for (const c of verdict.cases) {
        const tag = c.verdict?.pass ? "✓" : "✗";
        console.log(`  ${tag} ${c.case?.id ?? "?"}  ${c.verdict?.summary ?? ""}`);
    }
}
if (Array.isArray(verdict.ctx?.rows)) {
    console.log(`\n── Filas registradas (${verdict.ctx.rows.length}) ──`);
    for (const row of verdict.ctx.rows.slice(0, 30)) {
        console.log("  " + JSON.stringify(row));
    }
    if (verdict.ctx.rows.length > 30) console.log(`  ... y ${verdict.ctx.rows.length - 30} más`);
}
process.exit(verdict.pass ? 0 : 1);