/**
 * Evaluación de métricas declarativas en runtime.
 *
 * Una métrica tiene `compute(ctx, verdict, steps)` (código). Si está presente,
 * se evalúa para producir `{ value, sub, accent, hidden }`. Si no, el valor se
 * lee directamente de `verdict[key]`.
 *
 * El showWhen se evalúa similar para decidir si la métrica se oculta.
 */

import { runHook } from "./hooks.mjs";

export async function computeMetric(metric, ctx, verdict, steps) {
    if (!metric) return null;
    // Ocultar
    if (metric.showWhen) {
        const r = await runHook("showWhen", metric.showWhen, ctx, [verdict, steps], 1000);
        if (r.ok && r.value === false) return null;
    }
    // Valor principal
    let value = undefined;
    let sub = metric.sub || "";
    let accent = metric.accent;
    let hidden = false;
    if (metric.compute) {
        const r = await runHook("compute", metric.compute, ctx, [verdict, steps], 2000);
        if (!r.ok) {
            value = "—";
            sub = `compute error: ${r.error?.slice(0, 60) ?? ""}`;
        } else if (r.value && typeof r.value === "object") {
            if ("hidden" in r.value) hidden = !!r.value.hidden;
            if ("value" in r.value) value = r.value.value;
            if ("sub" in r.value) sub = String(r.value.sub ?? "");
            if ("accent" in r.value) accent = String(r.value.accent ?? metric.accent);
        } else if (r.value !== undefined) {
            value = r.value;
        }
    } else if (verdict && metric.key in verdict) {
        value = verdict[metric.key];
    } else if (metric.key === "duration") {
        value = verdict?.duration;
    } else if (metric.key === "totalSteps") {
        value = steps?.length ?? 0;
    } else if (metric.key === "currentStep") {
        value = steps?.length ?? 0;
    } else {
        value = "—";
    }
    if (hidden) return null;
    return { ...metric, value, sub, accent };
}