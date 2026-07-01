#!/usr/bin/env node
/**
 * Smoke test del runner — sin servidor, mock fetch + verificar SSE parsing + state.
 * Uso: node scripts/smoke-runner.mjs
 */
import { runTest, formatVerdict } from "./index.mjs";

function sse(payloads) {
    return payloads.map((p, i) => `id: ${i + 1}\nevent: ${p.event}\ndata: ${JSON.stringify(p.data)}\n\n`).join("");
}

function makeMockFetch(script) {
    let i = 0;
    return async (_url, _init) => {
        const r = script[i++] ?? script[script.length - 1];
        return new Response(r.body, { status: r.status, headers: { "content-type": r.contentType ?? "text/event-stream" } });
    };
}

const test = {
    id: "smoke",
    title: "Smoke conv runner",
    steps: [
        { kind: "conv", description: "mensaje 1", prompt: "hola" },
        { kind: "conv", description: "mensaje 2", prompt: "sigue" },
        { kind: "conv", description: "mensaje 3", prompt: "adiós" },
        { kind: "script", description: "juez", run: "const v = { pass: ctx._trace.messages === 3, totalMessages: ctx._trace.messages, titleChanges: ctx._trace.titleChangesSoFar.length, expectedMinChanges: 1, changesTimeline: ctx._trace.titleChangesSoFar, reason: ctx._trace.messages === 3 ? 'OK 3 mensajes' : 'FAIL' }; ctx.vars.verdict = v; return { verdict: v };" },
    ],
};

const mock = makeMockFetch([
    { status: 200, body: sse([
        { event: "begin", data: { iconversacion: 100, titulo: "Nueva conversación" } },
        { event: "message", data: { respuesta: "Hola" } },
        { event: "end", data: { iconversacion: 100, titulo: "Nueva conversación", respuesta: "Hola" } },
    ]) },
    { status: 200, body: sse([
        { event: "begin", data: { iconversacion: 100, titulo: "Nueva conversación" } },
        { event: "message", data: { respuesta: "Cómo va?" } },
        { event: "end", data: { iconversacion: 100, titulo: "Conversación sobre hola", respuesta: "Cómo va?" } },
    ]) },
    { status: 200, body: sse([
        { event: "begin", data: { iconversacion: 100, titulo: "Conversación sobre hola" } },
        { event: "message", data: { respuesta: "Adiós" } },
        { event: "end", data: { iconversacion: 100, titulo: "Conversación sobre hola", respuesta: "Adiós" } },
    ]) },
]);

const verdict = await runTest(test, { apiBase: "https://x.test", fetchImpl: mock });
console.log(formatVerdict(verdict, { verbose: true, color: true }));
const convs = verdict.steps.filter((s) => s.kind === "conv");
if (convs.length !== 3) throw new Error(`expected 3 conv, got ${convs.length}`);
if (convs[0].iconversacion !== 100 || convs[1].iconversacion !== 100 || convs[2].iconversacion !== 100) throw new Error("iconversacion no se preservó entre steps");
if (!convs[1].titleChange || convs[1].titleChange.to !== "Conversación sobre hola") throw new Error("title change no detectado");
if (!verdict.pass) throw new Error("verdict PASS esperado");
console.log("\n✅ smoke runner OK");
