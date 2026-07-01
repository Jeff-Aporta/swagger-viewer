/** Format verdict into a human-readable report for the UI. */

const ANSI = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
};

function fmtValue(v) {
    if (v == null) return "—";
    if (typeof v === "object") {
        if ("value" in v) return fmtValue(v.value);
        return JSON.stringify(v);
    }
    return String(v);
}

/**
 * @param {Verdict} verdict
 * @param {{ verbose?: boolean, color?: boolean }} [opts]
 */
export function formatVerdict(verdict, opts = {}) {
    const useColor = opts.color !== false;
    const lines = [];
    const title = `${verdict.pass ? "✅ PASS" : "❌ FAIL"} ${verdict.reason}`;
    lines.push(useColor && verdict.pass ? ANSI.green + ANSI.bold + title + ANSI.reset : title);
    lines.push("");

    // Resumen declarativo si verdict.metrics existe
    if (verdict.metrics && typeof verdict.metrics === "object") {
        lines.push("Métricas declaradas por el test:");
        for (const [key, m] of Object.entries(verdict.metrics)) {
            const v = fmtValue(m);
            const sub = m?.sub ? ` — ${m.sub}` : "";
            lines.push(`  · ${m.label ?? key}: ${v}${sub}`);
        }
        lines.push("");
    }

    // Compat: resumen clásico si no hay métricas
    if (!verdict.metrics) {
        const summary = `Pasos: ${verdict.steps.length} · Mensajes: ${verdict.totalMessages} · Cambios título: ${verdict.titleChanges} (esperado >= ${verdict.expectedMinChanges}) · Duración: ${Math.round(verdict.duration)} ms`;
        lines.push(useColor ? ANSI.dim + summary + ANSI.reset : summary);
        lines.push("");
    }

    if (verdict.changesTimeline?.length) {
        lines.push("Línea de tiempo de cambios de título:");
        for (const c of verdict.changesTimeline) {
            const line = `  · después del mensaje #${c.afterMessage}: ${c.from ?? "(vacío)"} → ${c.to}`;
            lines.push(useColor ? ANSI.cyan + line + ANSI.reset : line);
        }
        lines.push("");
    }
    if (opts.verbose) {
        lines.push("Pasos ejecutados:");
        for (const s of verdict.steps) {
            const tag = s.ok ? "✓" : "✗";
            const head = `  ${tag} [${String(s.index).padStart(2, "0")}] ${s.kind.padEnd(7)} ${Math.round(s.duration)}ms`;
            lines.push(s.ok ? (useColor ? ANSI.green + head + ANSI.reset : head) : (useColor ? ANSI.red + head + ANSI.reset : head));
            if (s.description) lines.push(`       ${s.description}`);
            if (s.kind === "conv") {
                if (s.iconversacion != null) lines.push(`       iconversacion=${s.iconversacion}`);
                if (s.titulo) lines.push(`       titulo=${s.titulo}`);
                if (s.titleChange) lines.push(`       titleChange: ${s.titleChange.from ?? "(vacío)"} → ${s.titleChange.to}`);
                if (s.delta) lines.push(`       delta: ${s.delta.slice(0, 200)}${s.delta.length > 200 ? "…" : ""}`);
                if (s.error) lines.push(`       error=${s.error}`);
            } else if (s.kind === "http" || s.kind === "raw") {
                if (s.status != null) lines.push(`       status=${s.status}`);
                if (s.error) lines.push(`       error=${s.error}`);
            } else if (s.kind === "script") {
                if (s.verdict) lines.push(`       verdict: ${JSON.stringify(s.verdict)}`);
                if (s.error) lines.push(`       error=${s.error}`);
            }
        }
    }
    return lines.join("\n");
}