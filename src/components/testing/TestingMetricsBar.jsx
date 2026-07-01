/**
 * Barra de métricas del test: cards con total de pasos, mensajes, cambios de título,
 * intervalo leído del ISS, duración, veredicto. Grid alineado y compacto.
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
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} s`;
    const m = Math.floor(s / 60);
    const rest = Math.round(s - m * 60);
    return `${m}m ${rest}s`;
}

export function TestingMetricsBar({ verdict, totalSteps, isRunning, currentStep, ns = "ISS" }) {
    const c = useGlassColors();
    const interval = verdict?.recalcularTituloCadaMensajesUsuario;
    const configSource = verdict?.conversacionConfig?.source;
    const expected = verdict?.expectedMinChanges;
    const pass = verdict?.pass;
    const accentPass = "#22c55e";
    const accentFail = "#ef4444";
    const accentInfo = "#1e90ff";
    const accentNeutral = "#a855f7";

    const progress = totalSteps > 0 ? Math.min(100, Math.round((currentStep / totalSteps) * 100)) : 0;

    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: "100%" }}
        >
            <MetricCard
                icon={pass ? "mdi:check-decagram" : "mdi:close-octagon-outline"}
                label="Veredicto"
                value={verdict ? (pass ? "PASS" : "FAIL") : (isRunning ? "En curso" : "Pendiente")}
                sub={verdict?.reason?.slice(0, 80)}
                accent={verdict ? (pass ? accentPass : accentFail) : accentNeutral}
                c={c}
                ns={ns}
            />
            <MetricCard
                icon="mdi:format-list-numbered"
                label="Pasos"
                value={isRunning ? `${currentStep}/${totalSteps}` : `${totalSteps}`}
                sub={isRunning ? `${progress}% completado` : `${totalSteps} ejecutados`}
                accent={accentInfo}
                c={c}
                ns={ns}
            />
            <MetricCard
                icon="mdi:message-text-outline"
                label="Mensajes"
                value={verdict?.totalMessages ?? "—"}
                sub="steps conv ejecutados"
                accent={accentNeutral}
                c={c}
                ns={ns}
            />
            <MetricCard
                icon="mdi:rename-box-outline"
                label="Cambios título"
                value={verdict ? `${verdict.titleChanges}/${expected ?? "?"}` : "—"}
                sub={verdict ? `esperado ≥ ${expected}` : "cambios detectados"}
                accent={(verdict?.titleChanges ?? 0) >= (expected ?? Infinity) ? accentPass : accentNeutral}
                c={c}
                ns={ns}
            />
            <MetricCard
                icon="mdi:cog-outline"
                label="Intervalo ISS"
                value={interval != null ? `cada ${interval}` : "—"}
                sub={configSource ? `fuente: ${configSource}` : "config/conversacion"}
                accent={accentInfo}
                c={c}
                ns={ns}
            />
            <MetricCard
                icon="mdi:timer-outline"
                label="Duración"
                value={verdict ? formatDuration(verdict.duration) : isRunning ? "…" : "—"}
                sub={verdict?.startedAt ? new Date(verdict.startedAt).toLocaleTimeString() : ""}
                accent={accentNeutral}
                c={c}
                ns={ns}
            />
        </Stack>
    );
}