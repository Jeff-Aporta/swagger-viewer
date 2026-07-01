/**
 * Barra de métricas del test — consume métricas declarativas.
 *
 * Cada test declara su `metrics[]` (con showWhen/compute); el runner calcula
 * los valores y los expone como `verdict.metrics[key] = { value, sub, accent,
 * icon, label }`. Esta barra solo renderiza lo declarado; nunca muestra
 * métricas hardcodeadas.
 *
 * Si el test no declara métricas, se muestran defaults mínimos útiles:
 * pass/fail, total de pasos y duración.
 */
const { useMemo } = React;
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Stack, Typography, Chip } = MaterialUI;

function MetricCard({ icon, label, value, sub, accent, c, ns }) {
    return (
        <Box
            sx={{
                flex: "1 1 0",
                minWidth: 110,
                p: 1.25,
                borderRadius: 1,
                background: c.cardBg,
                border: `1px solid ${c.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
                transition: "border-color .2s, box-shadow .2s",
                "&:hover": {
                    borderColor: accent,
                    boxShadow: c.dark ? `0 0 18px ${accent}22` : `0 0 12px ${accent}22`,
                },
            }}
        >
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: accent }}>
                <SwIcon icon={icon} size={14} ns={ns} aria-hidden />
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, fontSize: "0.65rem" }}>
                    {label}
                </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, lineHeight: 1.1 }}>
                {value}
            </Typography>
            {sub && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                    {sub}
                </Typography>
            )}
        </Box>
    );
}

function formatDuration(ms) {
    if (ms == null) return "—";
    if (!Number.isFinite(ms)) return "—";
    const total = Math.max(0, Math.round(ms));
    const h = Math.floor(total / 3_600_000);
    const m = Math.floor((total % 3_600_000) / 60_000);
    const s = Math.floor((total % 60_000) / 1000);
    const pad2 = (n) => String(n).padStart(2, "0");
    if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
    if (m > 0) return `${m}:${pad2(s)}`;
    return `${total} ms`;
}

function formatMetricValue(v, kind) {
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "object" && v !== null && "value" in v) return formatMetricValue(v.value, kind);
    if (kind === "duration") return formatDuration(Number(v));
    if (kind === "ratio") {
        const num = Number(v);
        if (!Number.isFinite(num)) return String(v);
        return `${Math.round(num * 100)}%`;
    }
    if (typeof v === "number") return v.toLocaleString();
    return String(v);
}

const DEFAULT_METRICS = [
    { key: "_verdict", label: "Veredicto", icon: "mdi:check-decagram", accent: "#a855f7", order: 0 },
    { key: "_steps", label: "Pasos", icon: "mdi:format-list-numbered", accent: "#1e90ff", order: 10 },
    { key: "_duration", label: "Duración", icon: "mdi:timer-outline", accent: "#a855f7", order: 999 },
];

export function TestingMetricsBar({ verdict, totalSteps, isRunning, currentStep, ns = "ISS" }) {
    const c = useGlassColors();
    const declared = verdict?.metrics && typeof verdict.metrics === "object" ? verdict.metrics : null;
    const metrics = useMemo(() => {
        const list = [];
        if (declared) {
            for (const [key, m] of Object.entries(declared)) {
                list.push({
                    key,
                    label: m.label ?? key,
                    icon: m.icon ?? "mdi:chart-line-variant",
                    accent: m.accent ?? "#a855f7",
                    sub: m.sub ?? "",
                    value: m.value,
                    kind: "value",
                    order: 100,
                });
            }
        }
        // Defaults mínimos si no hay declarados
        if (!list.length) {
            const pass = verdict?.pass;
            list.push({
                key: "_verdict",
                label: "Veredicto",
                icon: pass ? "mdi:check-decagram" : "mdi:close-octagon-outline",
                accent: pass ? "#22c55e" : "#ef4444",
                value: verdict ? (pass ? "PASS" : "FAIL") : (isRunning ? "En curso" : "Pendiente"),
                sub: verdict?.reason?.slice(0, 80) ?? "",
                order: 0,
            });
            list.push({
                key: "_steps",
                label: "Pasos",
                icon: "mdi:format-list-numbered",
                accent: "#1e90ff",
                value: isRunning ? `${currentStep}/${totalSteps}` : `${totalSteps}`,
                sub: isRunning ? `${totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0}% completado` : `${totalSteps} ejecutados`,
                order: 10,
            });
            list.push({
                key: "_duration",
                label: "Duración",
                icon: "mdi:timer-outline",
                accent: "#a855f7",
                value: verdict ? formatDuration(verdict.duration) : isRunning ? "…" : "—",
                sub: verdict?.startedAt ? new Date(verdict.startedAt).toLocaleTimeString() : "",
                kind: "duration",
                order: 999,
            });
        }
        return list.sort((a, b) => a.order - b.order);
    }, [declared, verdict, isRunning, currentStep, totalSteps]);

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: "100%", flexWrap: "wrap" }}
        >
            {metrics.map((m) => (
                <MetricCard
                    key={m.key}
                    icon={m.icon}
                    label={m.label}
                    value={formatMetricValue(m.value, m.kind)}
                    sub={m.sub}
                    accent={m.accent}
                    c={c}
                    ns={ns}
                />
            ))}
        </Stack>
    );
}