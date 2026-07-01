#!/usr/bin/env node
/**
 * Smoke test que simula EXACTAMENTE el formato SSE del backend.
 * Reproduce: id: N\nevent: <name>\ndata: <JSON>\n\n sin espacio extra.
 */
import { runTest } from "./index.mjs";

function backendSse(payloads) {
    return payloads.map((p, i) => `id: ${i + 1}\nevent: ${p.event}\ndata: ${JSON.stringify(p.data)}\n\n`).join("");
}

function makeMock(script) {
    let i = 0;
    return async (url, init) => {
        const r = script[i++] ?? script[script.length - 1];
        console.log(`  [fetch #${i}] ${init?.method ?? "GET"} ${url.replace("https://x.test", "")} body=${init?.body?.slice(0, 80)}`);
        return new Response(r.body, { status: r.status, headers: { "content-type": r.contentType ?? "text/event-stream" } });
    };
}

const test = {
    id: "backend-mock",
    title: "Backend mock conv",
    steps: [
        { kind: "conv", description: "msg 1", prompt: "hola" },
        { kind: "conv", description: "msg 2", prompt: "sigue" },
        { kind: "conv", description: "msg 3", prompt: "ya" },
        { kind: "script", description: "juez", run: "const v = { pass: ctx._trace.messages === 3 && ctx.iconversacion !== null, totalMessages: ctx._trace.messages, titleChanges: ctx._trace.titleChangesSoFar.length, expectedMinChanges: 1, changesTimeline: ctx._trace.titleChangesSoFar, reason: 'check' }; ctx.vars.verdict = v; return { verdict: v };" },
    ],
};

// Simula el backend: el response del streamConversacion hereda el iconversacion creado.
// 1ª llamada: sin iconversacion → crea; devuelve event: end con iconversacion: 100.
// 2ª y 3ª: con iconversacion → reusa; mismo iconversacion en el end event.
const mock = makeMock([
    { status: 200, body: backendSse([
        { event: "begin", data: { iconversacion: 100, titulo: "Nueva conversación", iusuario: "TEST@X", nombres: "Test" } },
        { event: "message", data: { iconversacion: 100, titulo: "Nueva conversación", respuesta: "Hola" } },
        { event: "end", data: { iconversacion: 100, titulo: "Hola — test inicial", respuesta: "Hola", imensaje: 1 } },
    ]) },
    { status: 200, body: backendSse([
        { event: "begin", data: { iconversacion: 100, titulo: "Hola — test inicial" } },
        { event: "message", data: { iconversacion: 100, titulo: "Hola — test inicial", respuesta: "Cómo va?" } },
        { event: "end", data: { iconversacion: 100, titulo: "Hola — test inicial", respuesta: "Cómo va?", imensaje: 2 } },
    ]) },
    { status: 200, body: backendSse([
        { event: "begin", data: { iconversacion: 100, titulo: "Hola — test inicial" } },
        { event: "message", data: { iconversacion: 100, titulo: "Hola — test inicial", respuesta: "Adiós" } },
        { event: "end", data: { iconversacion: 100, titulo: "Hola — test inicial", respuesta: "Adiós", imensaje: 3 } },
    ]) },
]);

console.log("▶ Ejecutando test con mock que simula backend\n");
const verdict = await runTest(test, {
    apiBase: "https://x.test",
    fetchImpl: mock,
    onStep: (s) => {
        const tag = s.ok ? "✓" : "✗";
        const conv = s.kind === "conv" ? ` iconv=${s.iconversacion ?? "(null)"} titulo=${s.titulo ?? "(null)"}` : "";
        console.log(`  ${tag} [${s.index}] ${s.kind} ${Math.round(s.duration)}ms${conv}${s.error ? ` error=${s.error}` : ""}`);
    },
});

console.log("\nVerdict:", JSON.stringify(verdict, null, 2));
const convs = verdict.steps.filter((s) => s.kind === "conv");
console.log(`\n✓ iconversaciones: ${convs.map((c) => c.iconversacion ?? "null").join(", ")}`);
if (convs[0].iconversacion !== 100) throw new Error("step 0 no extrajo iconversacion");
if (convs[1].iconversacion !== 100) throw new Error("step 1 no extrajo iconversacion");
if (convs[2].iconversacion !== 100) throw new Error("step 2 no extrajo iconversacion");
console.log("\n✅ backend-mock smoke OK");
