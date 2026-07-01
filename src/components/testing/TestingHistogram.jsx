/**
 * Histograma de distribución de duraciones de steps.
 * Lee `data` (calculado por el runner vía tools.compute('histogram')).
 * Barras verticales, escala log si max > 5s para mantener legibilidad.
 */
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Stack, Typography, Tooltip, Chip } = MaterialUI;

function formatMs(ms) {
    if (ms == null || !Number.isFinite(ms)) return "—";
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
}

export function TestingHistogram({ data, ns = "ISS" }) {
    const c = useGlassColors();
    if (!data || !Array.isArray(data.bins) || data.total === 0) {
        return (
            <Typography variant="caption" color="text.secondary">
                Sin pasos con duración registrada.
            </Typography>
        );
    }
    const maxCount = Math.max(1, ...data.bins.map((b) => b.count));
    const peak = data.bins.reduce((best, b) => (b.count > best.count ? b : best), { count: 0, lo: 0, hi: 0 });

    return (
        <Box sx={{ width: "100%" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <SwIcon icon="mdi:chart-histogram" size={14} ns={ns} aria-hidden />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Distribución de tiempos por paso
                </Typography>
                <Chip size="small" variant="outlined" label={`${data.total} pasos`} sx={{ height: 18, fontSize: "0.65rem" }} />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    min {formatMs(data.min)} · p50 {formatMs(data.p50)} · avg {formatMs(data.avg)} · p95 {formatMs(data.p95)} · max {formatMs(data.max)}
                </Typography>
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${data.bins.length}, 1fr)`,
                    alignItems: "end",
                    gap: 0.5,
                    height: 92,
                    px: 1.5,
                    py: 1,
                    borderRadius: 1,
                    background: c.preBg,
                    border: `1px solid ${c.border}`,
                }}
            >
                {data.bins.map((b, i) => {
                    const h = Math.max(2, Math.round((b.count / maxCount) * 80));
                    const isPeak = b === peak && b.count > 0;
                    return (
                        <Tooltip
                            key={i}
                            arrow
                            placement="top"
                            title={
                                <Box sx={{ p: 0.5 }}>
                                    <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                                        {formatMs(b.lo)} – {formatMs(b.hi)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block" }}>
                                        {b.count} paso{b.count === 1 ? "" : "s"}
                                    </Typography>
                                </Box>
                            }
                        >
                            <Box
                                sx={{
                                    height: `${h}px`,
                                    borderRadius: 0.75,
                                    background: isPeak
                                        ? "linear-gradient(180deg, #a855f7, #1e90ff)"
                                        : c.dark
                                        ? "linear-gradient(180deg, rgba(168,85,247,0.55), rgba(30,144,255,0.25))"
                                        : "linear-gradient(180deg, rgba(168,85,247,0.45), rgba(30,144,255,0.18))",
                                    border: isPeak ? "1px solid #a855f7" : `1px solid ${c.border}`,
                                    transition: "transform .15s",
                                    cursor: "default",
                                    "&:hover": { transform: "translateY(-2px)" },
                                }}
                            />
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
}