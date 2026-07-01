/**
 * Línea de tiempo horizontal de cambios de título detectados por el runner.
 * Un punto por cada `titleChange` con etiqueta del paso (mensaje #) y tooltip con el from/to.
 */
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Stack, Tooltip, Typography, Chip } = MaterialUI;

export function TestingTimeline({ changes = [], totalMessages = 0, ns = "ISS" }) {
    const c = useGlassColors();
    if (!Array.isArray(changes) || !changes.length) {
        return (
            <Typography variant="caption" color="text.secondary">
                Sin cambios de título registrados.
            </Typography>
        );
    }

    const max = Math.max(totalMessages || 0, changes[changes.length - 1]?.afterMessage || 1, 1);

    return (
        <Box sx={{ width: "100%", mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <SwIcon icon="mdi:timeline-clock-outline" size={14} ns={ns} aria-hidden />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Cambios de título
                </Typography>
                <Chip size="small" label={`${changes.length} cambios`} variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
            </Stack>
            <Box
                sx={{
                    position: "relative",
                    height: 28,
                    borderRadius: 1,
                    background: c.preBg,
                    border: `1px solid ${c.border}`,
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        inset: "50% 0 auto 0",
                        height: 2,
                        background: `linear-gradient(90deg, ${c.border}, ${c.muted})`,
                        transform: "translateY(-50%)",
                    }}
                />
                {changes.map((cng, i) => {
                    const left = Math.min(100, Math.max(0, ((cng.afterMessage || 0) / max) * 100));
                    return (
                        <Tooltip
                            key={i}
                            arrow
                            placement="top"
                            title={
                                <Box sx={{ p: 0.5 }}>
                                    <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                                        Tras mensaje #{cng.afterMessage}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: "block" }}>
                                        {cng.from ?? "(vacío)"} → <strong>{cng.to}</strong>
                                    </Typography>
                                </Box>
                            }
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: `${left}%`,
                                    top: "50%",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    transform: "translate(-50%, -50%)",
                                    background: "linear-gradient(135deg, #1e90ff, #a855f7)",
                                    boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.18), 0 0 12px rgba(168, 85, 247, 0.55)",
                                    cursor: "pointer",
                                }}
                            />
                        </Tooltip>
                    );
                })}
            </Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">msg #1</Typography>
                <Typography variant="caption" color="text.secondary">msg #{max}</Typography>
            </Stack>
        </Box>
    );
}