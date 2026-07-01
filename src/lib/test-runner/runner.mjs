/**
 * Client test runner — agnóstico, ejecuta tests `insoft.client-testing`.
 * Server solo datos (SYS_VALUES.swagger/testing); el runner es 100% cliente.
 * Step kinds: conv | http | raw | script.
 *
 * Estado entre steps:
 *   - vars:      {iconversacion, titulo, ...} — outputs explícitos disponibles vía {{key}}.
 *   - trace:     runtime libre del test (logs/debug del runner).
 *   - _trace:    convenciones del juez (messages, titleChangesSoFar, ...).
 *   - steps:     StepResult[] — uno por step ejecutado.
 *
 * `conv` envía a POST /api/conversacion.
 *   - Primer step SIN iconversacion en ctx → crea conversación.
 *   - Steps posteriores HEREDAN el iconversacion del SSE del step anterior.
 */

/** @typedef {{ kind: "conv", description?: string, prompt?: string }} RunnerStepConv */
/** @typedef {{ kind: "http"|"raw", description?: string, method?: string, path?: string, body?: unknown, expectStatus?: number, expectField?: string, expectMatches?: string, extract?: string, timeoutMs?: number }} RunnerStepHttp */
/** @typedef {{ kind: "script", description?: string, run?: string, timeoutMs?: number }} RunnerStepScript */
/** @typedef {RunnerStepConv|RunnerStepHttp|RunnerStepScript} RunnerStep */

/**
 * @typedef RunnerContext
 * @property {Record<string, unknown>} vars
 * @property {Record<string, unknown>} trace
 * @property {{ messages: number, titleChangesSoFar: Array<{afterMessage:number, from: string|null, to: string}> }} _trace
 * @property {Array<any>} steps
 * @property {number|null} iconversacion
 * @property {string|null} lastTitulo
 */

const DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO = 3;

/** GET público /system/config/conversacion — envelope InSoft o body plano. */
async function loadConversacionConfigFromApi(apiBase, fetchImpl) {
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

export { loadConversacionConfigFromApi };

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
        _trace: { messages: 0, titleChangesSoFar: [] },
        steps: [],
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

async function executeConv(step, ctx, opts) {
    const startedAt = nowIso();
    const t0 = performance.now();
    const f = opts.fetchImpl ?? fetch;
    const prompt = interpolate(step.prompt ?? "", ctx.vars);
    const body = { prompt };
    if (ctx.iconversacion != null) body.iconversacion = ctx.iconversacion;
    // Pausa entre steps evita que la conexión SSE recién cerrada colisione
    // con el siguiente POST (Node undici keep-alive).
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
        return { index: ctx.steps.length, kind: "conv", description: step.description, ok: false, error: e?.message ?? String(e), duration: performance.now() - t0, startedAt, endedAt: nowIso() };
    }
    const text = await res.text();
    if (!res.ok) {
        return { index: ctx.steps.length, kind: "conv", description: step.description, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 240)}`, duration: performance.now() - t0, startedAt, endedAt: nowIso() };
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
    if (iconversacion != null) ctx.iconversacion = iconversacion;
    if (titulo) ctx.vars.titulo = titulo;
    if (iconversacion != null) ctx.vars.iconversacion = iconversacion;
    const titleChange = titulo ? inferTitleChange(ctx, titulo) : null;
    return {
        index: ctx.steps.length,
        kind: "conv",
        description: step.description,
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

/**
 * @param {{id?: string, title?: string, description?: string, steps: RunnerStep[]}} test
 * @param {{apiBase: string, jwt?: string, origin?: string, fetchImpl?: typeof fetch, onStep?: (s: any) => void}} opts
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
    let lastScript = null;
    for (const step of (test.steps ?? [])) {
        let r;
        if (step.kind === "conv") r = await executeConv(step, ctx, opts);
        else if (step.kind === "http" || step.kind === "raw") r = await executeHttp(step, ctx, opts);
        else if (step.kind === "script") r = executeScript(step, ctx);
        else r = { index: ctx.steps.length, kind: step.kind, ok: false, error: `kind desconocido: ${step.kind}`, duration: 0, startedAt: nowIso(), endedAt: nowIso() };
        ctx.steps.push(r);
        if (step.kind === "script") lastScript = r;
        if (opts.onStep) try { opts.onStep(r); } catch { /* ignore onStep errors */ }
    }
    const endedAt = nowIso();
    const duration = performance.now() - t0;
    if (lastScript && lastScript.verdict) {
        return { ...lastScript.verdict, steps: ctx.steps, startedAt, endedAt, duration };
    }
    const totalMessages = ctx._trace.messages;
    const changes = ctx._trace.titleChangesSoFar.length;
    const interval = Number(ctx.vars.recalcularTituloCadaMensajesUsuario) || DEFAULT_RECALCULAR_TITULO_CADA_MENSAJES_USUARIO;
    const expected = Math.floor(totalMessages / interval);
    const pass = changes >= expected;
    const reason = pass
        ? `OK: ${changes} cambios de título en ${totalMessages} mensajes (>= ${expected}).`
        : `FAIL: solo ${changes} cambios en ${totalMessages} mensajes (esperaba >= ${expected}).`;
    return {
        pass,
        reason,
        totalMessages,
        titleChanges: changes,
        expectedMinChanges: expected,
        recalcularTituloCadaMensajesUsuario: interval,
        conversacionConfig,
        changesTimeline: ctx._trace.titleChangesSoFar.slice(),
        steps: ctx.steps,
        startedAt,
        endedAt,
        duration,
    };
}
