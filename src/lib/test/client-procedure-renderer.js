// client-procedure-renderer.js
// Ejecutor agnóstico de tests definidos **dentro del JSON** de `viewer.client.tests[*].steps`.
//
// Filosofía:
// - El servidor NO define ni ejecuta tests. Suministra solo la API productiva.
// - Cada test es un array de `steps` declarativos en el spec JSON.
// - El visor (esta librería) los interpreta secuencialmente (fetch + SSE + script).
// - No hay "protocolos" nombrados ni registry: cada test trae sus propios steps.
//
// Tipos de step soportados (kind):
//   - conv:    POST {{baseUrl}}/conversacion (SSE), typewriterMsPerToken.
//   - http:    GET/POST/PUT/PATCH/DELETE arbitrario. Soporta {{baseUrl}} y {{var}}.
//   - raw:     igual que http pero sin auto Content-Type.
//   - script:  JS en sandbox; return true / string motivo / objeto { verdict }.
//
// Cada step admite: description, extract, assert, skipIf, onlyIf, timeoutMs.
//
// Interfaz pública:
//   runStepsAsStream({ steps, baseUrl, getJwt, emit, session }) -> { ok, verdict, stepResults, error, ctx }

import { getStoredJwt } from "../auth/auth.js";

const DEFAULT_BASEURL = "/api";

/** ------------------- utilidades puras (sin estado) ------------------- */

function interpolate(template, vars) {
    if (template == null) return template;
    if (typeof template === "string") {
        return template.replace(/\{\{\s*([a-zA-Z0-9_\.\-]+)\s*\}\}/g, (_, key) => {
            const v = key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), vars);
            return v == null ? "" : String(v);
        });
    }
    if (Array.isArray(template)) return template.map((t) => interpolate(t, vars));
    if (typeof template === "object") {
        const out = {};
        for (const [k, v] of Object.entries(template)) out[k] = interpolate(v, vars);
        return out;
    }
    return template;
}

function interpolateHeaders(h, vars) {
    const out = {};
    for (const [k, v] of Object.entries(h || {})) out[k] = interpolate(v, vars);
    return out;
}

function extractByPath(obj, path) {
    if (!path || obj == null) return undefined;
    const parts = String(path).replace(/^\$/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        const m = /^\d+$/.test(p) ? Number(p) : p;
        cur = cur[m];
    }
    return cur;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function safeFunctionEval(jsExpr, argsNames, argsValues) {
    // Construimos una función de manera controlada.
    const body = `"use strict"; return (function(){ ${jsExpr} })();`;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...argsNames, body);
    return fn(...argsValues);
}

function truncate(s, max) {
    s = String(s);
    if (s.length <= max) return s;
    return s.slice(0, max - 30) + "\n\n... [truncado, " + s.length + " bytes totales] ...";
}

function normalizeStep(step, idx, total) {
    const inferred = step.kind
        || (step.prompt != null ? "conv"
            : step.run != null ? "script"
                : step.method || step.path ? "http" : "raw");
    return { ...step, kind: inferred, _index: idx, _total: total };
}

/** ------------------- API pública ------------------- */

/**
 * Ejecuta un array de `steps` agnósticos.
 * @param {object} opts
 * @param {Array<object>} opts.steps     - Array de steps declarativos (sin registry global).
 * @param {string} [opts.baseUrl]        - URL base (ej. https://api/contapyme/api). Default "/api".
 * @param {Function} [opts.getJwt]      - Devuelve el JWT vigente. Por defecto getStoredJwt().
 * @param {Function} [opts.emit]        - Callback de eventos (recibe objetos context/step/delta/tick/summary/error/trace).
 * @param {string} [opts.session="client-test"]
 * @param {number} [opts.perStepTimeoutMs=45000]
 * @param {number} [opts.tickIntervalMs=1000]
 * @param {number} [opts.typewriterDefaultMsPerToken=22]
 * @returns {Promise<{ok, verdict, stepResults, error, ctx}>}
 */
export async function runStepsAsStream({
    steps: rawSteps,
    baseUrl,
    getJwt,
    emit = () => {},
    session = "client-test",
    perStepTimeoutMs = 45_000,
    tickIntervalMs = 1000,
    typewriterDefaultMsPerToken = 22,
} = {}) {
    const stepsArr = Array.isArray(rawSteps) ? rawSteps : [];
    const total = stepsArr.length;
    const jwtFn = typeof getJwt === "function" ? getJwt : () => getStoredJwt()?.token;

    const ctx = {
        vars: {},
        stepIndex: -1,
        lastResponse: null,
        lastSseEvents: [],
        session,
        _trace: { messages: 0, titleChangesSoFar: [], currentTitle: null, steps: [], session, startedAt: Date.now() },
        _startStep: 0,
    };

    const stepResults = [];
    let verdict = null;
    let topError = null;

    const resolveBaseUrl = () => (baseUrl || DEFAULT_BASEURL).replace(/\/+$/, "");
    const authHeaders = () => {
        const jwt = jwtFn();
        const h = { Accept: "application/json" };
        if (jwt) h.Authorization = `Bearer ${jwt}`;
        return h;
    };

    async function evalMaybe(script, predName) {
        if (script == null) return false;
        try {
            const r = safeFunctionEval(`return (${script})`, ["ctx"], [ctx]);
            return !!(await Promise.resolve(r));
        } catch (e) {
            throw new Error(`[${predName}] falló al evaluar: ${e?.message || e}`);
        }
    }

    async function runScriptStep(step) {
        const r = await safeFunctionEval(
            `return (async () => { ${step.run} })()`,
            ["ctx"],
            [ctx],
        );
        return await Promise.resolve(r);
    }

    async function runHttpStep(step, kind) {
        const base = resolveBaseUrl();
        const path = step.path || "";
        const url = (path.startsWith("http://") || path.startsWith("https://"))
            ? path
            : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
        const method = (step.method || (kind === "raw" ? "POST" : "GET")).toUpperCase();
        const headers = interpolateHeaders({ ...(step.headers || {}) }, ctx.vars);
        if (step.body != null && kind !== "raw" && !("Content-Type" in headers) && !("content-type" in headers)) {
            headers["Content-Type"] = step.contentType || "application/json";
        }
        const init = { method, headers: { ...authHeaders(), ...headers } };
        if (step.body != null && method !== "GET" && method !== "HEAD") {
            const ib = interpolate(step.body, ctx.vars);
            init.body = typeof ib === "string" ? ib : JSON.stringify(ib);
        }
        const controller = new AbortController();
        const timeoutMs = step.timeoutMs ?? perStepTimeoutMs;
        const to = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(url, { ...init, signal: controller.signal });
        } finally { clearTimeout(to); }
        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch { json = null; }
        return { status: res.status, ok: res.ok, url, method, text, body: json, headers: Object.fromEntries(res.headers.entries()) };
    }

    async function runConvStep(step, onDelta, onTick) {
        const base = resolveBaseUrl();
        const url = `${base}/conversacion`;
        const headers = { ...authHeaders(), ...interpolateHeaders(step.headers || {}, ctx.vars), "Content-Type": step.contentType || "application/json" };
        const prompt = interpolate(step.prompt || "", ctx.vars);
        const body = interpolate(
            step.body && typeof step.body === "object"
                ? { ...step.body, prompt }
                : { ...(step.body || {}), prompt },
            ctx.vars,
        );
        const init = { method: (step.method || "POST").toUpperCase(), headers, body: JSON.stringify(body) };
        const controller = new AbortController();
        const timeoutMs = step.timeoutMs ?? perStepTimeoutMs;
        const to = setTimeout(() => controller.abort(), timeoutMs);
        let res;
        try {
            res = await fetch(url, init);
        } catch (e) {
            clearTimeout(to);
            throw e;
        }
        if (!res.body) {
            clearTimeout(to);
            const text = await res.text();
            return { status: res.status, ok: res.ok, text, body: null, chunks: [], accumulated: "" };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        const chunks = [];
        let accumulated = "";
        const startedAt = performance.now();
        let bytesReceived = 0;
        const tickTimer = setInterval(() => {
            onTick({ bytesReceived, elapsedMs: Math.round(performance.now() - startedAt) });
        }, tickIntervalMs);
        const typewriterMs = step.typewriterMsPerToken ?? typewriterDefaultMsPerToken;
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                bytesReceived += value?.byteLength || 0;
                const piece = decoder.decode(value, { stream: true });
                accumulated += piece;
                chunks.push(piece);
                if (typewriterMs > 0) {
                    const tokens = piece.split(/(\s+)/).filter((t) => t.length > 0);
                    for (const tk of tokens) {
                        onDelta({ chunk: tk });
                        if (/\s/.test(tk)) continue;
                        await sleep(typewriterMs);
                    }
                } else {
                    onDelta({ chunk: piece });
                }
            }
            const tail = decoder.decode();
            if (tail) {
                accumulated += tail;
                chunks.push(tail);
                onDelta({ chunk: tail });
            }
            clearInterval(tickTimer);
            clearTimeout(to);
            return { status: res.status, ok: res.ok, accumulated, chunks, text: accumulated };
        } catch (e) {
            clearInterval(tickTimer);
            clearTimeout(to);
            throw e;
        }
    }

    function applyExtract(step, lastResponse) {
        if (!step.extract) return;
        for (const [varName, jsonPath] of Object.entries(step.extract)) {
            const value = extractByPath(lastResponse, jsonPath);
            if (value !== undefined) ctx.vars[varName] = value;
        }
    }

    /** Bucle principal. */
    emit({ type: "context", md: `## Test — \`${session}\`\n\nSteps: ${total}. El cliente maneja todo (visor Swagger).`, session, total });

    try {
        for (let i = 0; i < total; i++) {
            const step = normalizeStep(stepsArr[i], i, total);
            ctx.stepIndex = i;

            if (await evalMaybe(step.skipIf, "skipIf")) {
                emit({ type: "step", md: `### Paso ${i + 1}/${total} — ⏭️ OMITIDO\n\n*${step.description || step.kind}*` });
                stepResults.push({ index: i, kind: step.kind, status: "skipped" });
                continue;
            }
            if (!(await evalMaybe(step.onlyIf ?? "true", "onlyIf"))) {
                emit({ type: "step", md: `### Paso ${i + 1}/${total} — ⏭️ OMITIDO (onlyIf)\n\n*${step.description || step.kind}*` });
                stepResults.push({ index: i, kind: step.kind, status: "skipped" });
                continue;
            }

            const stepId = `step-${i}`;
            let responseForExtract = null;
            const desc = step.description || `${step.kind} paso ${i + 1}`;
            emit({ type: "step", md: `### Paso ${i + 1}/${total} — ${step.kind.toUpperCase()}\n\n${desc}` });

            try {
                if (step.kind === "conv") {
                    const r = await runConvStep(step,
                        (d) => emit({ type: "delta", stepId, chunk: d.chunk }),
                        (t) => emit({ type: "tick", bytesReceived: t.bytesReceived, elapsedMs: t.elapsedMs, stepId }),
                    );
                    responseForExtract = {
                        iconversacion: r.body?.iconversacion,
                        titulo: r.body?.titulo,
                        status: r.status,
                        chunks: r.chunks,
                        accumulated: r.accumulated,
                    };
                    ctx.lastResponse = responseForExtract;
                    ctx.lastSseEvents = [];
                    ctx._trace.messages += 1;
                    if (responseForExtract.titulo && ctx._trace.currentTitle && responseForExtract.titulo !== ctx._trace.currentTitle) {
                        ctx._trace.titleChangesSoFar.push({
                            afterMessage: ctx._trace.messages,
                            from: ctx._trace.currentTitle,
                            to: responseForExtract.titulo,
                        });
                    }
                    if (responseForExtract.titulo) ctx._trace.currentTitle = responseForExtract.titulo;
                    emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ conv (HTTP ${r.status})\n\n- Mensajes acumulados: ${ctx._trace.messages}\n- Título actual: \`${ctx._trace.currentTitle || "(vacío)"}\`\n- Cambios de título: ${ctx._trace.titleChangesSoFar.length}` });
                } else if (step.kind === "http" || step.kind === "raw") {
                    const r = await runHttpStep(step, step.kind);
                    responseForExtract = r;
                    ctx.lastResponse = r;
                    ctx.lastSseEvents = [];
                    if (!r.ok && (!step.expectStatus || !step.expectStatus.includes(r.status))) {
                        throw new Error(`HTTP ${r.status} inesperado`);
                    }
                    emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ ${step.kind} (HTTP ${r.status} ${r.method} ${r.url.replace(resolveBaseUrl(), "{{baseUrl}}")})\n\n\`\`\`json\n${truncate(JSON.stringify(r.body ?? r.text, null, 2), 4096)}\n\`\`\`` });
                } else if (step.kind === "script") {
                    const r = await runScriptStep(step);
                    if (r === true) {
                        emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ script` });
                    } else if (typeof r === "string") {
                        throw new Error(`Script juez: ${r}`);
                    } else if (r === undefined) {
                        emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ script (sin return explícito)` });
                    } else if (r && typeof r === "object" && "verdict" in r) {
                        verdict = r.verdict || r;
                        emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ script\n\n\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\`` });
                    } else {
                        emit({ type: "step", md: `#### ✅ Paso ${i + 1}/✅ script (return: ${JSON.stringify(r).slice(0, 200)})` });
                    }
                } else {
                    throw new Error(`kind desconocido: ${step.kind}`);
                }

                applyExtract(step, responseForExtract || ctx.lastResponse);

                if (step.assert) {
                    const ok = await evalMaybe(step.assert, "assert");
                    if (!ok) throw new Error(`Asserción devolvió false para paso ${i + 1}`);
                }

                ctx._trace.steps.push({ index: i, kind: step.kind, status: "passed" });
                stepResults.push({ index: i, kind: step.kind, status: "passed" });
            } catch (eStep) {
                emit({ type: "error", md: `#### ❌ Paso ${i + 1}/❌ ${step.kind}\n\n\`${eStep?.message || eStep}\`` });
                ctx._trace.steps.push({ index: i, kind: step.kind, status: "failed", error: eStep?.message || String(eStep) });
                stepResults.push({ index: i, kind: step.kind, status: "failed", error: eStep?.message || String(eStep) });
                if (i < total - 1 && step.kind !== "script") {
                    topError = topError || { message: eStep?.message || String(eStep) };
                    continue;
                }
                break;
            }
        }
    } catch (eTop) {
        topError = { message: eTop?.message || String(eTop) };
    }

    const passed = stepResults.filter((s) => s.status === "passed").length;
    const failed = stepResults.filter((s) => s.status === "failed").length;
    const skipped = stepResults.filter((s) => s.status === "skipped").length;
    const ok = !topError && failed === 0 && (verdict ? (verdict.pass ?? true) : true);

    const verdictMd = verdict
        ? `\n\n### 👑 Veredicto del juez\n\n\`\`\`json\n${JSON.stringify(verdict, null, 2)}\n\`\`\``
        : "";
    const summaryMd = `## Resumen del test\n\n- Total steps: ${total}\n- Passed: ${passed}\n- Failed: ${failed}\n- Skipped: ${skipped}\n- Mensajes enviados: ${ctx._trace.messages}\n- Cambios de título: ${ctx._trace.titleChangesSoFar.length}\n${verdictMd}\n\n${ok ? "✅ **PASS**" : "❌ **FAIL**"}${topError ? ` — \`${topError.message}\`` : ""}`;

    emit({ type: "summary", md: summaryMd, ok, passed, failed, skipped, total });
    emit({ type: "trace", trace: ctx._trace });
    return {
        ok,
        ctx,
        stepResults,
        verdict,
        error: topError,
    };
}

/**
 * Helper de compatibilidad: antes se llamaba runProtocolAsStream({ protocol, ... }).
 * Ahora se delega a runStepsAsStream usando los `steps` del protocolo.
 * (Mantenido por compat transitoria; evitar en código nuevo.)
 */
export async function runProtocolAsStream({ protocol, baseUrl, getJwt, emit }) {
    return runStepsAsStream({
        steps: protocol?.steps,
        baseUrl,
        getJwt,
        emit,
        session: protocol?.name || protocol?.id || "client-test",
    });
}

// Re-exports por compatibilidad (otros archivos todavía importan nombres antiguos).
export const getProtocol = () => null; // sin registro; los tests ya NO viven aquí.
export const listProtocols = () => []; // sin registro; los tests ya NO viven aquí.
