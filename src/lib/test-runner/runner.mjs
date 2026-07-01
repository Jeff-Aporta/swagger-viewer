/**
 * Client test runner — agnóstico, ejecuta tests `insoft.client-testing`.
 * Server solo datos (SYS_VALUES.swagger/testing); el runner es 100% cliente.
 *
 * Modelo declarativo:
 *   - test.protocol       nombre lógico (icono/color opcional, no cambia ejecución)
 *   - test.requiresAuth   bool (def. true si algún step es conv)
 *   - test.metrics[]      métricas declarativas con showWhen/compute
 *   - test.tools[]        herramientas declarativas (timeline, histogram, table)
 *   - test.table          config de tabla (columns[] + getRows)
 *   - test.hooks          { onStart, onUpdate, onEnd, onRegister }
 *   - test.steps[]        conv | http | raw | script
 *
 * Contexto `ctx` compartido:
 *   - vars        outputs explícitos para {{interpolación}}
 *   - trace       runtime libre del test
 *   - _trace      convenciones (messages, titleChangesSoFar, iconversacion, ...)
 *   - steps       StepResult[] acumulados
 *   - rows        buffer de filas registradas por steps con `record`
 *   - toolsData   mapa { [toolId]: any } (poblado por hooks.onUpdate)
 *   - metrics     mapa { [metricKey]: value } (poblado por hooks.onEnd)
 *
 * Step kinds:
 *   - conv        POST /api/conversacion (SSE)
 *   - http / raw  HTTP genérico contra opts.apiBase
 *   - script      código libre con `with (ctx)`, devuelve valor o setea ctx.vars.verdict
 */

import { runHook, normalizeMetrics, normalizeTools, normalizeTable } from "./hooks.mjs";
import { getTool } from "./tools.mjs";
import { computeMetric } from "./metrics.mjs";

/** @typedef {{ kind: "conv", description?: string, prompt?: string, record?: RecordSpec }} RunnerStepConv */
/** @typedef {{ kind: "http"|"raw", description?: string, method?: string, path?: string, body?: unknown, expectStatus?: number, expectField?: string, expectMatches?: string, extract?: string, timeoutMs?: number, record?: RecordSpec }} RunnerStepHttp */
/** @typedef {{ kind: "script", description?: string, run?: string, timeoutMs?: number }} RunnerStepScript */
/** @typedef RunnerStep */

/** @typedef {{ as?: string, columns?: Record<string, string> }} RecordSpec */
/** Step con `record` agrega fila(s) a ctx.rows al finalizar. Las `columns` son
 *  expresiones `with (ctx)` que producen strings para cada columna. */

/**
 * @typedef RunnerContext
 * @property {Record<string, unknown>} vars
 * @property {Record<string, unknown>} trace
 * @property {Record<string, unknown>} _trace
 * @property {Array<any>} steps
 * @property {Array<Record<string, unknown>>} rows
 * @property {Record<string, unknown>} toolsData
 * @property {Record<string, unknown>} metrics
 * @property {number|null} iconversacion
 * @property {string|null} lastTitulo
 */

const DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO = 3;

export async function loadConversacionConfigFromApi(apiBase, fetchImpl) {
    const f = fetchImpl ?? fetch;
    const url = `${String(apiBase ?? "").replace(/\/$/, "")}/system/config/conversacion`;
    try {
        const res = await f(url, { headers: { Accept: "application/json" } });
        if (!res.ok) {
            return {
                recalcularTituloCadaMensajesUsuario: DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO,
                source: "default",
                httpStatus: res.status,
            };
        }
        const data = await res.json();
        const cfg = data?.respuesta?.config ?? data?.config ?? {};
        const n = Number(cfg.recalcularTituloCadaMensajesUsuario);
        const interval = Number.isFinite(n) && n >= 1 ? Math.round(n) : DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO;
        return {
            recalcularTituloCadaMensajesUsuario: interval,
            source: "api",
            key: data?.respuesta?.key ?? data?.key ?? "config/conversacion",
        };
    } catch (e) {
        return {
            recalcularTituloCadaMensajesUsuario: DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO,
            source: "default",
            error: e?.message ?? String(e),
        };
    }
}

const PLACEHOLDER_RX = /\{\{\s*([a-zA-Z_][\w.-]*)\s*\}\}/g;

function interpolate(input, vars) {
    if (typeof input === "string") {
        if (!input.includes("{{")) return input;
        return input.replace(PLACEHOLDER_RX, (_m, k) => {
            const v = vars[k];
            return v == null ? "" : String(v);
        });
    }
    if (Array.isArray(input)) return input.map((x) => interpolate(x, vars));
    if (input && typeof input === "object") {
        const out = {};
        for (const [k, v] of Object.entries(input)) out[k] = interpolate(v, vars);
        return out;
    }
    return input;
}

function newContext() {
    return {
        vars: {},
        trace: {},
        _trace: { messages: 0, titleChangesSoFar: [], iconversacion: null, lastTitulo: null },
        steps: [],
        rows: [],
        toolsData: {},
        metrics: {},
        iconversacion: null,
        lastTitulo: null,
    };
}

function nowIso() { return new Date().toISOString(); }

function inferTitleChange(ctx, newTitulo) {
    if (!newTitulo || newTitulo === ctx.lastTitulo) return null;
    const change = { afterMessage: ctx._trace.messages, from: ctx.lastTitulo, to: newTitulo };
    ctx._trace.titleChangesSoFar.push(change);
    ctx.lastTitulo = newTitulo;
    return change;
}

function parseSseStream(text) {
    const events = [];
    const blocks = text.split(/\r?\n\r?\n/);
    for (const block of blocks) {
        if (!block.trim()) continue;
        let id;
        let event = "message";
        const data = [];
        for (const line of block.split(/\r?\n/)) {
            if (line.startsWith("id:")) id = line.slice(3).trim();
            else if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data.push(line.slice(5).trim());
        }
        if (data.length) events.push({ id, event, data: data.join("\n") });
    }
    return events;
}

/** Evalúa `columns` de un step.record y agrega fila(s) al ctx.rows. */
async function recordStep(step, stepResult, ctx) {
    const rec = step.record;
    if (!rec) return;
    const columns = rec.columns && typeof rec.columns === "object" ? rec.columns : {};
    const as = String(rec.as ?? "row");
    const row = { _as: as, _stepIndex: stepResult.index };
    for (const [key, expr] of Object.entries(columns)) {
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function("ctx", "step", `with (ctx) { return (function(step){ ${expr} })(); }`);
            const v = fn(ctx, stepResult);
            row[key] = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
        } catch (e) {
            row[key] = `error: ${e?.message ?? String(e)}`;
        }
    }
    if (ctx.rows) ctx.rows.push(row);
    // Hook onRegister(row, ctx)
    if (ctx.hooks?.onRegister) {
        await runHook("onRegister", ctx.hooks.onRegister, ctx, [row], 2000);
    }
}

async function executeConv(step, ctx, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const f = opts.fetchImpl ?? fetch;
    const prompt = interpolate(step.prompt ?? "", ctx.vars);
    const body = { prompt };
    if (ctx.iconversacion != null) body.iconversacion = ctx.iconversacion;
    if (ctx.iconversacion != null) await new Promise((r) => setTimeout(r, opts.stepDelayMs ?? 250));
    let res;
    try {
        res = await f(`${opts.apiBase}/conversacion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Connection: "close",
                ...(opts.jwt ? { Authorization: `Bearer ${opts.jwt}` } : {}),
                ...(opts.origin ? { Origin: opts.origin } : {}),
            },
            body: JSON.stringify(body),
        });
    } catch (e) {
        return { index: ctx.steps.length, kind: "conv", description: step.description, prompt, ok: false, error: e?.message ?? String(e), duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const text = await res.text();
    if (!res.ok) {
        return { index: ctx.steps.length, kind: "conv", description: step.description, prompt, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 240)}`, duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const events = parseSseStream(text);
    let lastEnd = null;
    let delta = "";
    for (const ev of events) {
        if (ev.event === "message") {
            try {
                const obj = JSON.parse(ev.data);
                if (typeof obj.respuesta === "string") delta = obj.respuesta;
            } catch { /* ignore */ }
        } else if (ev.event === "end") {
            try { lastEnd = JSON.parse(ev.data); } catch { lastEnd = null; }
        }
    }
    ctx._trace.messages += 1;
    let iconversacion = ctx.iconversacion;
    let titulo = null;
    if (lastEnd) {
        const ic = Number(lastEnd.iconversacion);
        if (Number.isFinite(ic) && ic > 0) iconversacion = ic;
        if (typeof lastEnd.titulo === "string") titulo = lastEnd.titulo;
    }
    if (iconversacion != null) {
        ctx.iconversacion = iconversacion;
        ctx._trace.iconversacion = iconversacion;
    }
    if (titulo) ctx.vars.titulo = titulo;
    if (iconversacion != null) ctx.vars.iconversacion = iconversacion;
    const titleChange = titulo ? inferTitleChange(ctx, titulo) : null;
    return {
        index: ctx.steps.length,
        kind: "conv",
        description: step.description,
        prompt,
        ok: true,
        duration: performance.now() - t0,
        startedAt,
        endedAt: nowIso(),
        delta: delta || undefined,
        titulo: titulo ?? undefined,
        iconversacion: iconversacion ?? undefined,
        titleChange: titleChange ?? undefined,
    };
}

async function executeHttp(step, ctx, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const f = opts.fetchImpl ?? fetch;
    const method = (step.method ?? "GET").toUpperCase();
    const path = interpolate(step.path ?? "/", ctx.vars);
    const url = `${opts.apiBase}${path.startsWith("/") ? path : `/${path}`}`;
    const body = step.body != null ? JSON.stringify(interpolate(step.body, ctx.vars)) : undefined;
    let res;
    try {
        res = await f(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(opts.jwt ? { Authorization: `Bearer ${opts.jwt}` } : {}),
            },
            body: method === "GET" || method === "HEAD" ? undefined : body,
        });
    } catch (e) {
        return { index: ctx.steps.length, kind: step.kind, description: step.description, ok: false, error: e?.message ?? String(e), duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const bodyText = await res.text();
    let parsed = null;
    if (bodyText) {
        try { parsed = JSON.parse(bodyText); } catch { parsed = null; }
    }
    let ok = res.ok;
    let error;
    if (step.expectStatus != null && res.status !== step.expectStatus) {
        ok = false;
        error = `status esperado ${step.expectStatus}, recibido ${res.status}`;
    }
    if (ok && step.expectField) {
        const v = parsed?.[step.expectField];
        if (v == null) { ok = false; error = `campo esperado ${step.expectField} ausente`; }
        else if (step.expectMatches) {
            const rx = step.expectMatches instanceof RegExp ? step.expectMatches : new RegExp(step.expectMatches);
            if (!rx.test(String(v))) { ok = false; error = `campo ${step.expectField}=${JSON.stringify(v)} no coincide /${rx.source}/`; }
        }
    }
    return {
        index: ctx.steps.length,
        kind: step.kind,
        description: step.description,
        ok,
        error,
        duration: performance.now() - t0,
        startedAt,
        endedAt: nowIso(),
        status: res.status,
        body: parsed ?? undefined,
    };
}

function executeScript(step, ctx) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const code = step.run ?? "";
    const scriptCtx = {
        vars: ctx.vars,
        trace: ctx.trace,
        _trace: ctx._trace,
        steps: ctx.steps,
        rows: ctx.rows,
        toolsData: ctx.toolsData,
        metrics: ctx.metrics,
        iconversacion: ctx.iconversacion,
        lastTitulo: ctx.lastTitulo,
    };
    let output;
    let verdict;
    let ok = true;
    let error;
    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("ctx", `with (ctx) { return (function(){ ${code} })(); }`);
        output = fn(scriptCtx);
        const v = scriptCtx.vars.verdict;
        if (v && typeof v === "object") verdict = v;
        if (!verdict && output && typeof output === "object" && output.verdict) {
            verdict = output.verdict;
        }
    } catch (e) {
        ok = false;
        error = e?.message ?? String(e);
    }
    return {
        index: ctx.steps.length,
        kind: "script",
        description: step.description,
        ok,
        error,
        duration: performance.now() - t0,
        startedAt,
        endedAt: nowIso(),
        verdict,
        output,
    };
}

/** Aplica el hook `onUpdate` después de cada step, alimentando `toolsData`/`metrics`. */
async function runUpdateHook(test, stepResult, ctx) {
    if (!test?.hooks?.onUpdate) return;
    const r = await runHook("onUpdate", test.hooks.onUpdate, ctx, [stepResult, ctx], 3000);
    if (!r.ok) {
        ctx.trace.hookErrors = ctx.trace.hookErrors || [];
        ctx.trace.hookErrors.push({ where: "onUpdate", stepIndex: stepResult.index, error: r.error });
    }
    await recordStep(stepResult._step, stepResult, ctx);
}

/**
 * @param {{id?: string, title?: string, protocol?: string, metrics?: any[], tools?: any[], table?: any, hooks?: any, steps: RunnerStep[]}} test
 * @param {{apiBase: string, jwt?: string, origin?: string, fetchImpl?: typeof fetch, stepDelayMs?: number, onStep?: (s: any, ctx?: any) => void}} opts
 * @returns {Promise<Verdict>}
 */
export async function runTest(test, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const ctx = newContext();
    if (opts.jwt) ctx.vars.jwt = opts.jwt;

    const conversacionConfig = await loadConversacionConfigFromApi(opts.apiBase, opts.fetchImpl);
    ctx.vars.recalcularTituloCadaMensajesUsuario = conversacionConfig.recalcularTituloCadaMensajesUsuario;
    ctx.trace.conversacionConfig = conversacionConfig;

    // Metadata declarativa
    ctx.test = {
        id: test.id,
        title: test.title,
        protocol: test.protocol,
        metrics: normalizeMetrics(test.metrics),
        tools: normalizeTools(test.tools),
        table: normalizeTable(test.table),
        hooks: test.hooks || {},
    };

    // Hook onStart
    if (test.hooks?.onStart) {
        await runHook("onStart", test.hooks.onStart, ctx, [test], 3000);
    }

    let lastScript = null;
    for (const step of (test.steps ?? [])) {
        let r;
        if (step.kind === "conv") r = await executeConv(step, ctx, opts);
        else if (step.kind === "http" || step.kind === "raw") r = await executeHttp(step, ctx, opts);
        else if (step.kind === "script") r = executeScript(step, ctx);
        else r = { index: ctx.steps.length, kind: step.kind, ok: false, error: `kind desconocido: ${step.kind}`, duration: 0, startedAt: nowIso(), endedAt: nowIso() };
        r._step = step;
        ctx.steps.push(r);
        if (step.kind === "script") lastScript = r;
        await runUpdateHook(test, r, ctx);
        if (opts.onStep) try { opts.onStep(r, ctx); } catch { /* ignore */ }
    }

    // Hook onEnd → puede devolver verdict y/o metrics adicionales
    let verdictFromEnd = null;
    let metricsFromEnd = null;
    if (test.hooks?.onEnd) {
        const r = await runHook("onEnd", test.hooks.onEnd, ctx, [ctx.steps, test], 5000);
        if (r.ok) {
            if (r.value && typeof r.value === "object") {
                if (r.value.verdict) verdictFromEnd = r.value.verdict;
                if (r.value.metrics) metricsFromEnd = r.value.metrics;
            }
        } else if (!r.ok) {
            ctx.trace.hookErrors = ctx.trace.hookErrors || [];
            ctx.trace.hookErrors.push({ where: "onEnd", error: r.error });
        }
    }

    // Pre-resolver verdict
    let verdict;
    if (verdictFromEnd) {
        verdict = { ...verdictFromEnd };
    } else if (lastScript && lastScript.verdict) {
        verdict = { ...lastScript.verdict };
    } else {
        // Default mínimo: depende del test (sin lógica dura).
        verdict = {
            pass: false,
            reason: "El test no produjo un verdict (sin hook onEnd y sin step kind=script con verdict).",
        };
    }
    if (metricsFromEnd) verdict.metrics = { ...(verdict.metrics || {}), ...metricsFromEnd };

    // Mezclar metrics declarativas computadas
    const declaredMetrics = ctx.test.metrics;
    const computedMetrics = [];
    for (const m of declaredMetrics) {
        const r = await computeMetric(m, ctx, verdict, ctx.steps);
        if (r) computedMetrics.push(r);
    }
    if (computedMetrics.length) {
        verdict.metrics = verdict.metrics || {};
        for (const cm of computedMetrics) verdict.metrics[cm.key] = { value: cm.value, sub: cm.sub, accent: cm.accent, icon: cm.icon, label: cm.label };
    }

    const endedAt = nowIso();
    const duration = performance.now() - t0;

    return {
        ...verdict,
        steps: ctx.steps,
        startedAt,
        endedAt,
        duration,
        ctx: {
            rows: ctx.rows,
            toolsData: ctx.toolsData,
            metrics: ctx.metrics,
            trace: ctx.trace,
            _trace: ctx._trace,
            vars: ctx.vars,
            declaracion: {
                metrics: declaredMetrics,
                tools: ctx.test.tools,
                table: ctx.test.table,
            },
        },
    };
}