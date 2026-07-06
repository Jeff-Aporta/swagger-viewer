/**
 * Línea de tiempo horizontal de cambios de título detectados por el runner.
 * - Una marca tenue por cada mensaje del USR (con/sin cambio).
 * - Un punto resaltado por cada `titleChange` con tooltip del from/to.
 * - Padding interno lateral para que las marcas no queden pegadas al borde.
 */
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Box, Stack, Tooltip, Typography, Chip } = MaterialUI;

export function TestingTimeline({ changes = [], totalMessages = 0, ns = "ISS" }) {
    const c = useGlassColors();
    const total = Math.max(totalMessages || 0, 1);
    const list = Array.isArray(changes) ? changes : [];
    const changeSet = new Set(list.map((x) => Number(x?.afterMessage) || 0));

    if (!totalMessages) {
        return (
            <Typography variant="caption" color="text.secondary">
                Sin cambios de título registrados.
            </Typography>
        );
    }

    const ratioOf = (n) => Math.min(1, Math.max(0, (n - 1) / Math.max(1, total - 1)));

    return (
        <Box sx={{ width: "100%", mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <SwIcon icon="mdi:timeline-clock-outline" size={14} ns={ns} aria-hidden />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Cambios de título
                </Typography>
                <Chip size="small" label={`${list.length} cambios`} variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                <Chip size="small" label={`${totalMessages} mensajes`} variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
            </Stack>
            <Box
                sx={{
                    position: "relative",
                    height: 32,
                    px: 1.5, // padding interno lateral
                    borderRadius: 1,
                    background: c.preBg,
                    border: `1px solid ${c.border}`,
                    overflow: "hidden",
                }}
            >
                {/* línea base */}
                <Box
                    sx={{
                        position: "absolute",
                        inset: "50% 12px auto 12px",
                        height: 2,
                        background: `linear-gradient(90deg, ${c.border}, ${c.muted})`,
                        transform: "translateY(-50%)",
                    }}
                />

                {/* ticks tenues para todos los mensajes del USR (sin cambio) */}
                {Array.from({ length: totalMessages }, (_, i) => {
                    const n = i + 1;
                    if (changeSet.has(n)) return null;
                    return (
                        <Tooltip
                            key={`msg-${n}`}
                            arrow
                            placement="top"
                            title={`msg #${n} — sin cambio`}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: `calc(12px + (100% - 24px) * ${ratioOf(n)})`,
                                    top: "50%",
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    transform: "translate(-50%, -50%)",
                                    background: c.muted,
                                    opacity: 0.55,
                                    cursor: "default",
                                }}
                            />
                        </Tooltip>
                    );
                })}

                {/* puntos resaltados por cada cambio */}
                {list.map((cng, i) => {
                    const n = Number(cng.afterMessage) || 0;
                    if (n < 1) return null;
                    return (
                        <Tooltip
                            key={`cng-${i}`}
                            arrow
                            placement="top"
                            title={
                                <Box sx={{ p: 0.5 }}>
                                    <Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
                                        Tras mensaje #{n}
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
                                    left: `calc(12px + (100% - 24px) * ${ratioOf(n)})`,
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
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5, px: 1.5 }}>
                <Typography variant="caption" color="text.secondary">msg #1</Typography>
                <Typography variant="caption" color="text.secondary">msg #{totalMessages}</Typography>
            </Stack>
        </Box>
    );
}