/**
 * Registry de herramientas de visualización para tests `insoft.client-testing`.
 *
 * Cada tool es un módulo con:
 *   - id: string único ('timeline', 'histogram', ...)
 *   - title, icon, accent: presentación por defecto
 *   - defaultConfig(): configuración por defecto
 *   - compute(ctx, steps, verdict): produce data para renderizar
 *   - el componente React vive en src/components/testing/<id>/<PascalCase>.jsx
 *
 * El runner solo consume `compute()` y `defaultConfig()`; el renderizado
 * React vive en testing-tools/index.jsx → testing-tools/<id>.jsx.
 *
 * Para agregar una nueva tool:
 *   1. Definir aquí su compute().
 *   2. Crear el componente en src/components/testing/testing-tools/<id>.jsx.
 *   3. Registrar el import en testing-tools/index.jsx.
 *   4. Declarar `tools: [{ id: '<id>' }]` en el test.
 */

const TOOLS = new Map();

export function registerTool(id, def) {
    if (!id || typeof id !== "string") throw new Error("tool id requerido");
    TOOLS.set(id, def);
}

export function getTool(id) {
    return TOOLS.get(id) || null;
}

export function listTools() {
    return Array.from(TOOLS.keys());
}

/** Timeline: cambios discretos a lo largo del eje (mensaje #, evento).
 *  Funciona con cualquier buffer en `ctx.toolsData.timeline`.
 *  Si el buffer está vacío, intenta inferir cambios de título en conv steps. */
registerTool("timeline", {
    id: "timeline",
    title: "Línea de tiempo",
    icon: "mdi:timeline-clock-outline",
    accent: "#1e90ff",
    defaultConfig: () => ({}),
    compute(ctx, _steps, _verdict) {
        const items = Array.isArray(ctx?.toolsData?.timeline) ? ctx.toolsData.timeline : [];
        const total = Number(ctx?.toolsData?.timelineTotal ?? ctx?._trace?.messages ?? 0);
        return { items, total };
    },
});

/** Histograma: distribución de duraciones de steps. */
registerTool("histogram", {
    id: "histogram",
    title: "Histograma de tiempos",
    icon: "mdi:chart-histogram",
    accent: "#a855f7",
    defaultConfig: () => ({ bins: 10 }),
    compute(ctx, steps, _verdict) {
        const durations = (steps ?? [])
            .map((s) => Number(s?.duration) || 0)
            .filter((d) => d > 0);
        const total = durations.length;
        if (!total) return { bins: [], total: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0 };
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / total;
        const sorted = [...durations].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(total * 0.5)];
        const p95 = sorted[Math.min(total - 1, Math.floor(total * 0.95))];
        const binsCount = 10;
        const width = (max - min) / binsCount || 1;
        const bins = Array.from({ length: binsCount }, (_, i) => {
            const lo = min + i * width;
            const hi = i === binsCount - 1 ? max + 1 : min + (i + 1) * width;
            const count = durations.filter((d) => d >= lo && d < hi).length;
            return { lo, hi, count };
        });
        return { bins, total, min, max, avg, p50, p95 };
    },
});

/** Tabla: filas registradas por steps que tengan `record: { as: '...' }`.
 *  Se renderiza desde el panel, no necesita compute; lee `ctx.rows`. */
registerTool("table", {
    id: "table",
    title: "Registro",
    icon: "mdi:table",
    accent: "#22c55e",
    defaultConfig: () => ({}),
    compute(ctx) {
        return { rows: Array.isArray(ctx?.rows) ? ctx.rows.slice() : [] };
    },
});