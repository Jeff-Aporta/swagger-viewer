/**
 * Client test runner — agnóstico, ejecuta tests `testing`.
 * Server solo datos (SYS_VALUES.swagger/testing); el runner es 100% cliente.
 *
 * Interface agnóstica (multi-server + JWT por apiRef + cases + hooks + register/emit):
 *
 *   test.requires.apis.<name>  → { base?, public?: string[], auth?: string[], jwtRef?: "login"|"override"|string }
 *   test.setup.fetch[]         → GET públicos antes del primer step → ctx.vars[var]
 *   test.setup.init            → js expr con (ctx)
 *   test.steps[]               → stream | http | raw | script
 *   test.cases[]               → si está, runner instancia el test N veces (casesMode "each"|"matrix"|"single")
 *   test.metrics[]             → cards UI (compute / showWhen / format)
 *   test.tools[]               → visualizaciones (timeline | histogram | sparkline)
 *   test.table                 → tabla declarativa (columns[] con get() sobre ctx.rows)
 *   test.hooks                 → onStart | onStep | onCaseStart | onCaseEnd | onEnd | onRegister | onEmit
 *   test.verdict               → { pass?: js→bool, summary?: js→string } evaluado en onEnd
 *
 * Step kinds (generalizados):
 *   - stream   POST SSE (default path: /conversacion) — antes "conv"
 *   - http / raw HTTP genérico
 *   - script   código libre con `with (ctx)`
 *
 * Contexto `ctx` compartido:
 *   - apiBase                  base global (back-compat)
 *   - apis        <name> → base override por apiRef
 *   - jwt         <name> → bearer token por apiRef ("login", "override", o string)
 *   - case        caso activo (si test.cases[])
 *   - casesSummary  resumen de todos los cases corridos
 *   - vars        outputs de setup.fetch y extract → {{interpolación}}
 *   - trace       runtime libre
 *   - _trace      convenciones del runner
 *   - steps       StepResult[] acumulados
 *   - rows        buffer global (poblado por ctx.register o step.record)
 *   - toolsData   mapa { [toolId]: any } (poblado por onStep/onUpdate)
 *   - metrics     mapa { [metricKey]: value } (poblado por onEnd o declarativas)
 *   - helpers     register(as, row), emit(event, payload)
 */

import {
    runHook,
    normalizeMetrics,
    normalizeTools,
    normalizeTable,
    normalizeRequires,
    normalizeCases,
} from "./hooks.mjs";
import { getTool } from "./tools.mjs";
import { computeMetric } from "./metrics.mjs";

const DEFAULT_API_REF = "default";
const DEFAULT_STREAM_PATH = "/conversacion";
const DEFAULT_STREAM_RESPONSE_PATH = "/respuesta";
const PLACEHOLDER_RX = /\{\{\s*([\w$.[\]]+)\s*\}\}/g;
const TIMEOUT_DEFAULT_MS = 5_000;

export async function loadConversacionConfigFromApi(apiBase, fetchImpl) {
    const f = fetchImpl ?? fetch;
    const url = `${String(apiBase ?? "").replace(/\/$/, "")}/system/config/conversacion`;
    try {
        const res = await f(url);
        if (!res.ok) {
            return { source: `HTTP ${res.status}`, recalcularTituloCadaMensajesUsuario: 3 };
        }
        const text = await res.text();
        const env = JSON.parse(text);
        const cfg = env?.respuesta?.config ?? env?.config ?? env ?? {};
        return {
            source: "api",
            recalcularTituloCadaMensajesUsuario: Number(cfg.recalcularTituloCadaMensajesUsuario) || 3,
            raw: env,
        };
    } catch (e) {
        return { source: "error", recalcularTituloCadaMensajesUsuario: 3, error: e?.message ?? String(e) };
    }
}

function interpolate(input, vars, extras) {
    if (input == null) return input;
    if (typeof input === "string") {
        if (!input.includes("{{")) return input;
        return input.replace(PLACEHOLDER_RX, (_m, k) => {
            // 1) Path-based lookup en extras (ej: "case.params.prompt" → extras.case.params.prompt)
            if (extras) {
                const ev = resolvePath(extras, k);
                if (ev !== undefined) return String(ev);
            }
            // 2) Path-based lookup en vars
            const v = resolvePath(vars, k);
            return v == null ? "" : String(v);
        });
    }
    if (Array.isArray(input)) return input.map((x) => interpolate(x, vars, extras));
    if (input && typeof input === "object") {
        const out = {};
        for (const [k, v] of Object.entries(input)) out[k] = interpolate(v, vars, extras);
        return out;
    }
    return input;
}

/** Devuelve un objeto interpolable donde `{{case.X}}` y `{{case.params.X}}` resuelven via ctx.case. */
function interpolationScope(ctx) {
    return ctx?.case ? { case: ctx.case } : undefined;
}

/** Resuelve "a.b.c" o "a[0].b" sobre un objeto. */
function resolvePath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

function nowIso() { return new Date().toISOString(); }

function apiBaseFor(opts, apiRef) {
    const ref = apiRef ?? DEFAULT_API_REF;
    const bases = opts.apis || {};
    if (bases[ref]) return String(bases[ref]).replace(/\/$/, "");
    if (opts.apiBase) return String(opts.apiBase).replace(/\/$/, "");
    return "";
}

function jwtFor(opts, apiRef) {
    const ref = apiRef ?? DEFAULT_API_REF;
    const tokens = opts.jwt;
    if (!tokens) return undefined;
    if (typeof tokens === "string") return tokens; // back-compat: jwt global
    return tokens[ref] || tokens[DEFAULT_API_REF] || undefined;
}

function newContext(test) {
    return {
        test,
        apiBase: undefined,
        apis: undefined,
        jwt: undefined,
        case: undefined,
        vars: {},
        trace: {},
        _trace: {},
        steps: [],
        rows: [],
        toolsData: {},
        metrics: {},
        helpers: undefined, // se asigna después con register/emit
    };
}

function makeHelpers(ctx) {
    const registerFn = (as, row) => {
        const obj = { _as: String(as ?? "row"), ...row };
        ctx.rows.push(obj);
        const hook = ctx.test?.hooks?.onRegister;
        if (hook) runHook("onRegister", hook, ctx, [obj, as], 2000).catch(() => {});
        return obj;
    };
    const emitFn = (event, payload) => {
        const hook = ctx.test?.hooks?.onEmit;
        if (hook) runHook("onEmit", hook, ctx, [event, payload], 2000).catch(() => {});
    };
    return { register: registerFn, emit: emitFn };
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

/** Evalúa `columns` de un step.record y agrega fila(s) al ctx.rows via ctx.register(as, ...). */
async function recordStep(step, stepResult, ctx) {
    const rec = step.record;
    if (!rec || !ctx.helpers) return;
    const columns = rec.columns && typeof rec.columns === "object" ? rec.columns : {};
    const as = String(rec.as ?? "row");
    const row = { _as: as, _stepIndex: stepResult.index };
    for (const [key, expr] of Object.entries(columns)) {
        try {
            // eslint-disable-next-line no-new-func
            const source = `with (ctx) { return (function(step){ return (${expr}); })(step); }`;
            const fn = new Function("ctx", "step", source);
            const v = fn(ctx, stepResult);
            row[key] = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
        } catch (e) {
            row[key] = `error: ${e?.message ?? String(e)}`;
        }
    }
    ctx.helpers.register(as, row);
}

/** Step `stream`: POST SSE. Antes "conv". */
async function executeStream(step, ctx, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const f = opts.fetchImpl ?? fetch;
    const scope = interpolationScope(ctx);
    const prompt = interpolate(step.prompt ?? "", ctx.vars, scope);
    const apiRef = step.apiRef ?? DEFAULT_API_REF;
    const apiBase = apiBaseFor(opts, apiRef);
    const streamPath = step.streamPath ?? DEFAULT_STREAM_PATH;
    const responsePath = step.responsePath ?? DEFAULT_STREAM_RESPONSE_PATH;
    const body = { prompt };
    if (ctx.vars.iconversacion != null) body.iconversacion = ctx.vars.iconversacion;
    if (step.systemPrompt) body.systemPrompt = interpolate(step.systemPrompt, ctx.vars, scope);
    let res;
    try {
        const token = jwtFor(opts, apiRef);
        res = await f(`${apiBase}${streamPath}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Connection: "close",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(opts.origin ? { Origin: opts.origin } : {}),
            },
            body: JSON.stringify(body),
        });
    } catch (e) {
        return { index: ctx.steps.length, kind: "stream", description: step.description, prompt, ok: false, error: e?.message ?? String(e), duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const text = await res.text();
    if (!res.ok) {
        return { index: ctx.steps.length, kind: "stream", description: step.description, prompt, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 240)}`, duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const events = parseSseStream(text);
    let lastEnd = null;
    let delta = "";
    for (const ev of events) {
        if (ev.event === "message") {
            try {
                const obj = JSON.parse(ev.data);
                const respPath = responsePath.startsWith("/") ? responsePath.slice(1) : responsePath;
                if (typeof obj === "object" && obj) {
                    const v = resolvePath(obj, respPath);
                    if (typeof v === "string") delta = v;
                }
            } catch { /* ignore */ }
        } else if (ev.event === "end") {
            try { lastEnd = JSON.parse(ev.data); } catch { lastEnd = null; }
        }
    }
    const endOk = lastEnd ?? {};
    if (endOk.iconversacion != null) ctx.vars.iconversacion = endOk.iconversacion;
    if (endOk.titulo) ctx.vars.titulo = endOk.titulo;

    if (step.extract) {
        for (const [name, path] of Object.entries(step.extract)) {
            const v = resolvePath(endOk, path);
            if (v != null) ctx.vars[name] = v;
        }
    }
    return {
        index: ctx.steps.length,
        kind: "stream",
        description: step.description,
        prompt,
        ok: true,
        duration: performance.now() - t0,
        startedAt,
        endedAt: nowIso(),
        delta: delta || undefined,
        output: endOk,
    };
}

async function executeHttp(step, ctx, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const f = opts.fetchImpl ?? fetch;
    const method = (step.method ?? "GET").toUpperCase();
    const scope = interpolationScope(ctx);
    const path = interpolate(step.path ?? "/", ctx.vars, scope);
    const apiRef = step.apiRef ?? DEFAULT_API_REF;
    const apiBase = apiBaseFor(opts, apiRef);
    const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
    const body = step.body != null ? JSON.stringify(interpolate(step.body, ctx.vars, scope)) : undefined;
    const token = jwtFor(opts, apiRef);
    let res;
    try {
        res = await f(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const expect = step.expect ?? {};
    if (expect.status != null && res.status !== expect.status) {
        ok = false;
        error = `status esperado ${expect.status}, recibido ${res.status}`;
    }
    if (ok && expect.fieldEquals) {
        for (const [path, expected] of Object.entries(expect.fieldEquals)) {
            const actual = resolvePath(parsed, path);
            if (actual !== expected) {
                ok = false;
                error = `${path}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`;
                break;
            }
        }
    }
    if (ok && expect.matches) {
        for (const [path, pattern] of Object.entries(expect.matches)) {
            const actual = resolvePath(parsed, path);
            const rx = pattern instanceof RegExp ? pattern : new RegExp(pattern);
            if (actual == null || !rx.test(String(actual))) {
                ok = false;
                error = `${path}: ${JSON.stringify(actual)} no coincide /${rx.source}/`;
                break;
            }
        }
    }
    // backward-compat: expectStatus como campo plano
    if (ok && step.expectStatus != null && res.status !== step.expectStatus) {
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
    if (ok && step.extract) {
        for (const [name, path] of Object.entries(step.extract)) {
            const v = resolvePath(parsed, path);
            if (v != null) ctx.vars[name] = v;
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
        helpers: ctx.helpers,
        case: ctx.case,
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

/** Aplica el hook `onStep` después de cada step, alimenta `toolsData`/`metrics`. */
async function runStepHook(test, stepResult, ctx) {
    if (!test?.hooks?.onStep && !test?.hooks?.onUpdate) return;
    const code = test.hooks.onStep ?? test.hooks.onUpdate;
    const r = await runHook("onStep", code, ctx, [stepResult, ctx], 3000);
    if (!r.ok) {
        ctx.trace.hookErrors = ctx.trace.hookErrors || [];
        ctx.trace.hookErrors.push({ where: "onStep", stepIndex: stepResult.index, error: r.error });
    }
    await recordStep(stepResult._step, stepResult, ctx);
}

/** Setup: resuelve apis declaradas, ejecuta fetch[] + init, configurable por test. */
async function runSetup(test, ctx, opts) {
    const normalizedReqs = normalizeRequires(test.requires);
    // Pasa opts.apis / opts.jwt al ctx para referencia en scripts
    ctx.apis = opts.apis || (opts.apiBase ? { default: opts.apiBase } : {});
    ctx.jwt = opts.jwt;
    ctx.apiBase = opts.apiBase;
    ctx.requires = normalizedReqs;

    // Llamar hooks/setup si los tests declaran requires.apis.<ref>.preflight? Por ahora no.
    if (test.setup?.fetch?.length) {
        const f = opts.fetchImpl ?? fetch;
        const timeoutMs = Number(test.setup.timeoutMs ?? opts.setupTimeoutMs ?? 5000);
        const scope = interpolationScope(ctx);
        for (const item of test.setup.fetch) {
            const apiRef = item.apiRef ?? DEFAULT_API_REF;
            const base = apiBaseFor(opts, apiRef);
            const url = `${base}${interpolate(item.path, ctx.vars, scope)}`;
            const token = jwtFor(opts, apiRef);
            try {
                const ctl = new AbortController();
                const t = setTimeout(() => ctl.abort(new Error(`setup.fetch ${item.var} timeout ${timeoutMs}ms`)), timeoutMs);
                const res = await f(url, {
                    method: item.method ?? "GET",
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    signal: ctl.signal,
                });
                clearTimeout(t);
                const text = await res.text();
                let parsed = null;
                if (text) { try { parsed = JSON.parse(text); } catch { /* ignore */ } }
                ctx.vars[item.var] = parsed ?? text;
            } catch (e) {
                ctx.vars[item.var] = null;
                ctx.trace.setupErrors = ctx.trace.setupErrors || [];
                ctx.trace.setupErrors.push({ where: "setup.fetch", var: item.var, error: e?.message ?? String(e) });
            }
        }
    }
    if (test.setup?.init) {
        await runHook("setup.init", test.setup.init, ctx, [], test.setup.timeoutMs ?? 3000);
    }
}

/**
 * Corre UN test (un caso o todos si no hay cases[]).
 * @param {any} test
 * @param {{apiBase?: string, apis?: Record<string,string>, jwt?: string|Record<string,string>, origin?: string, fetchImpl?: typeof fetch, stepDelayMs?: number, onStep?: Function, case?: any}} opts
 */
export async function runTest(test, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const declaredMetrics = normalizeMetrics(test.metrics);
    const tools = normalizeTools(test.tools);
    const table = normalizeTable(test.table);
    const cases = normalizeCases(test.cases);
    const setupFn = (c) => runSetup(test, c, opts);
    const runOne = async (caseRef) => {
        const ctx = newContext(test);
        ctx.helpers = makeHelpers(ctx);
        ctx.case = caseRef;
        ctx.test = {
            id: test.id,
            title: test.title,
            protocol: test.protocol,
            metrics: declaredMetrics,
            tools,
            table,
            hooks: test.hooks || {},
        };
        await setupFn(ctx);
        if (test.hooks?.onStart) {
            await runHook("onStart", test.hooks.onStart, ctx, [test], 3000);
        }
        if (caseRef && test.hooks?.onCaseStart) {
            await runHook("onCaseStart", test.hooks.onCaseStart, ctx, [caseRef, ctx], 3000);
        }
        let lastScript = null;
        for (const step of (test.steps ?? [])) {
            if (step.skipIf) {
                try {
                    // eslint-disable-next-line no-new-func
                    const fn = new Function("ctx", `with (ctx) { return (function(){ ${step.skipIf} })(); }`);
                    if (fn(ctx)) continue;
                } catch { /* ignore */ }
            }
            let r;
            if (step.kind === "stream" || step.kind === "conv") r = await executeStream(step, ctx, opts);
            else if (step.kind === "http" || step.kind === "raw") r = await executeHttp(step, ctx, opts);
            else if (step.kind === "script") r = executeScript(step, ctx);
            else r = { index: ctx.steps.length, kind: step.kind, ok: false, error: `kind desconocido: ${step.kind}`, duration: 0, startedAt: nowIso(), endedAt: nowIso() };
            r._step = step;
            ctx.steps.push(r);
            if (step.kind === "script") lastScript = r;
            await runStepHook(test, r, ctx);
            if (opts.onStep) try { opts.onStep(r, ctx, caseRef); } catch { /* ignore */ }
        }
        let caseVerdict;
        if (caseRef && test.hooks?.onCaseEnd) {
            await runHook("onCaseEnd", test.hooks.onCaseEnd, ctx, [caseRef, ctx], 3000);
        }
        // onEnd → puede devolver {verdict, metrics}
        let verdictFromEnd = null;
        let metricsFromEnd = null;
        if (test.hooks?.onEnd) {
            const r = await runHook("onEnd", test.hooks.onEnd, ctx, [ctx.steps, test], 5000);
            if (r.ok && r.value && typeof r.value === "object") {
                if (r.value.verdict) verdictFromEnd = r.value.verdict;
                if (r.value.metrics) metricsFromEnd = r.value.metrics;
            } else if (!r.ok) {
                ctx.trace.hookErrors = ctx.trace.hookErrors || [];
                ctx.trace.hookErrors.push({ where: "onEnd", error: r.error });
            }
        }
        if (!verdictFromEnd && lastScript && lastScript.verdict) {
            verdictFromEnd = lastScript.verdict;
        }
        if (!verdictFromEnd && test.verdict?.pass) {
            try {
                // eslint-disable-next-line no-new-func
                const fn = new Function("ctx", `with (ctx) { return (function(){ return (${test.verdict.pass}); })(); }`);
                const pass = !!fn(ctx);
                let summary = "";
                if (test.verdict.summary) {
                    // eslint-disable-next-line no-new-func
                    const sfn = new Function("ctx", `with (ctx) { return (function(){ return (${test.verdict.summary}); })(); }`);
                    try { summary = String(sfn(ctx)); } catch { summary = ""; }
                }
                verdictFromEnd = { pass, summary };
            } catch (e) {
                verdictFromEnd = { pass: false, reason: `verdict.pass eval error: ${e?.message ?? String(e)}` };
            }
        }
        if (!verdictFromEnd) {
            verdictFromEnd = {
                pass: false,
                reason: "El test no produjo un verdict (sin hook onEnd y sin step kind=script con verdict, ni verdict.pass).",
            };
        }
        const verdict = { ...verdictFromEnd };
        if (metricsFromEnd) verdict.metrics = { ...(verdict.metrics || {}), ...metricsFromEnd };
        // Metrics declarativas computadas
        const computedMetrics = [];
        for (const m of declaredMetrics) {
            const r = await computeMetric(m, ctx, verdict, ctx.steps);
            if (r) computedMetrics.push(r);
        }
        if (computedMetrics.length) {
            verdict.metrics = verdict.metrics || {};
            for (const cm of computedMetrics) verdict.metrics[cm.key] = { value: cm.value, sub: cm.sub, accent: cm.accent, icon: cm.icon, label: cm.label };
        }
        if (caseRef) {
            ctx.casesSummary = ctx.casesSummary || [];
            ctx.casesSummary.push({ case: caseRef, verdict });
        }
        return { ctx, verdict };
    };

    // Multi-case
    if (cases.length > 0) {
        const summary = [];
        let allRows = [];
        let aggregateVerdict = { pass: true, summary: "" };
        for (const c of cases) {
            const { ctx, verdict } = await runOne(c);
            summary.push({ case: c, verdict });
            allRows = allRows.concat(ctx.rows);
        }
        // Determina pass global
        const failed = summary.filter((s) => !s.verdict?.pass);
        aggregateVerdict = {
            pass: failed.length === 0,
            summary: failed.length === 0
                ? `Todos los ${summary.length} casos pasaron`
                : `${failed.length}/${summary.length} casos fallaron`,
            perCase: summary.map((s) => ({ id: s.case.id, pass: !!s.verdict?.pass, summary: s.verdict?.summary ?? "" })),
        };
        // Mezclar metrics (sumarización opcional sobre per-case)
        const mergedRows = allRows;
        const endedAt = nowIso();
        const duration = performance.now() - t0;
        const lastCtx = (await runOne.__lastCtx?.()) || null;
        return {
            ...aggregateVerdict,
            steps: [],
            cases: summary,
            startedAt,
            endedAt,
            duration,
            ctx: {
                rows: mergedRows,
                toolsData: {},
                metrics: {},
                trace: {},
                _trace: {},
                vars: {},
                declaracion: { metrics: declaredMetrics, tools, table, cases },
                casesSummary: summary,
            },
        };
    }

    // Single-case: un solo run
    const { ctx, verdict } = await runOne(null);
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
            declaracion: { metrics: declaredMetrics, tools, table },
        },
    };
}