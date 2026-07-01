/**
 * Sistema de hooks agnóstico para tests `insoft.client-testing`.
 *
 * Cada test puede declarar `hooks: { onStart, onUpdate, onEnd, onRegister }`
 * como código JavaScript que el runner evalúa con `new Function` y un `ctx`
 * compartido (vars, trace, _trace, steps, rows, toolsData, ...).
 *
 * Los hooks son opcionales. Si están ausentes, el runner aplica defaults
 * mínimos: onStart no hace nada, onUpdate no hace nada, onEnd devuelve
 * `null` y deja al último step kind=script generar el verdict si lo trae.
 *
 * Hooks útiles:
 *   - onStart(ctx, test): void → se ejecuta 1 vez antes de cualquier step.
 *   - onUpdate(step, ctx, test): void → se ejecuta tras cada step. Útil
 *     para acumular métricas, popular `ctx.rows` o actualizar `ctx.toolsData`.
 *   - onEnd(ctx, steps, test): { verdict?, metrics? } | void → se ejecuta
 *     al finalizar. Si devuelve `verdict`, ese reemplaza al del último script.
 *     Si devuelve `metrics`, mergea con `verdict.metrics`.
 *   - onRegister(row, ctx): void → invocado por el runner cada vez que un
 *     step agrega una fila al buffer `ctx.rows` (ver step.record).
 *
 * El runner expone:
 *   - ctx.vars, ctx.trace, ctx._trace, ctx.steps (StepResult[])
 *   - ctx.rows: array de filas registradas (se llenan via onRegister).
 *   - ctx.toolsData: mapa { [toolId]: any } que las tools consumen.
 *   - ctx.metrics: mapa de métricas finales (pobladas por onEnd o calculadas).
 */

const TIMEOUT_DEFAULT_MS = 5_000;

/** Ejecuta un hook con timeout duro. Devuelve { ok, value, error }. */
export async function runHook(name, code, ctx, args = [], timeoutMs = TIMEOUT_DEFAULT_MS) {
    if (typeof code !== "string" || !code.trim()) return { ok: true, value: undefined };
    const startedAt = Date.now();
    let timer = null;
    try {
        const fn = new Function("ctx", "args", `with (ctx) { return (function(){ ${code} })(); }`);
        const result = await new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`hook ${name} timeout ${timeoutMs}ms`)), timeoutMs);
            try {
                const v = fn(ctx, args);
                if (v && typeof v.then === "function") v.then(resolve, reject);
                else resolve(v);
            } catch (e) {
                reject(e);
            }
        });
        return { ok: true, value: result, durationMs: Date.now() - startedAt };
    } catch (e) {
        return { ok: false, error: e?.message ?? String(e), durationMs: Date.now() - startedAt };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** Convierte una métrica declarativa en una entrada canónica. */
export function normalizeMetric(metric) {
    if (!metric || typeof metric !== "object") return null;
    const key = String(metric.key ?? "").trim();
    if (!key) return null;
    return {
        key,
        label: String(metric.label ?? metric.key).trim(),
        icon: String(metric.icon ?? "mdi:chart-line-variant").trim(),
        accent: String(metric.accent ?? "#a855f7").trim(),
        sub: typeof metric.sub === "string" ? metric.sub : "",
        showWhen: typeof metric.showWhen === "string" ? metric.showWhen : null,
        compute: typeof metric.compute === "string" ? metric.compute : null,
        unit: metric.unit ?? "",
        kind: metric.kind ?? "value", // "value" | "count" | "duration" | "ratio"
        order: Number(metric.order ?? 100),
    };
}

/** Normaliza array de métricas declarativas, las ordena y filtra inválidas. */
export function normalizeMetrics(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeMetric).filter(Boolean).sort((a, b) => a.order - b.order);
}

/** Normaliza array de tools declarativas. */
export function normalizeTools(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((t) => {
            if (!t || typeof t !== "object") return null;
            const id = String(t.id ?? "").trim();
            if (!id) return null;
            return {
                id,
                title: String(t.title ?? id).trim(),
                icon: String(t.icon ?? "mdi:chart-box-outline").trim(),
                accent: String(t.accent ?? "#1e90ff").trim(),
                showWhen: typeof t.showWhen === "string" ? t.showWhen : null,
                order: Number(t.order ?? 100),
                // La data real se calcula en runtime via hooks.onUpdate
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);
}

/** Normaliza la config de tabla declarativa. */
export function normalizeTable(tbl) {
    if (!tbl || typeof tbl !== "object") return null;
    if (!Array.isArray(tbl.columns) || !tbl.columns.length) return null;
    const cols = tbl.columns
        .map((c) => {
            if (!c || typeof c !== "object") return null;
            const key = String(c.key ?? "").trim();
            if (!key) return null;
            return {
                key,
                label: String(c.label ?? c.key).trim(),
                icon: String(c.icon ?? "").trim() || null,
                width: String(c.width ?? "").trim() || null,
                align: c.align === "right" || c.align === "center" ? c.align : "left",
                get: typeof c.get === "string" ? c.get : null,
            };
        })
        .filter(Boolean);
    if (!cols.length) return null;
    return {
        title: String(tbl.title ?? "Registro").trim(),
        emptyMessage: String(tbl.emptyMessage ?? "Sin filas registradas").trim(),
        columns: cols,
        order: Number(tbl.order ?? 200),
    };
}