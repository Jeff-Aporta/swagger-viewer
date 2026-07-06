import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import { useGlassColors, glassSurfaceSx, glassHeaderSx, GlassToolbar } from "../../../src/lib/ui/glass.jsx";

const { Box, Dialog, DialogContent, DialogActions, Button, Typography, Stack, Chip } = MaterialUI;

/**
 * Modal de selección de entorno ISS PatyIA — Local vs Producción.
 *
 * Nunca simula: cada preset es una URL real (?conn=).
 */
export function PatyIaEnvDialog({ open, onClose, onSelect, presets, ns = "ISS" }) {
    const c = useGlassColors();
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            className="isa-sw-demo__patyia-env"
            slotProps={{
                backdrop: { sx: { backdropFilter: "blur(6px)", backgroundColor: c.dark ? "rgba(2, 8, 23, 0.55)" : "rgba(15, 23, 42, 0.28)" } },
            }}
            PaperProps={{
                className: "isa-glass-surface",
                elevation: 0,
                sx: {
                    bgcolor: "transparent",
                    borderRadius: 3,
                    overflow: "hidden",
                    ...glassSurfaceSx(c, { tone: "default", radius: 16, blur: 16, hover: false }),
                },
            }}
        >
            <GlassToolbar
                tone="node"
                blur={10}
                radius={0}
                sx={{
                    flexShrink: 0,
                    borderRadius: 0,
                    ...glassHeaderSx(c, "#1e90ff", { px: 2.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.25 }),
                }}
            >
                <SwIcon icon="mdi:lan-connect" size={22} ns={ns} aria-hidden />
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, letterSpacing: "0.02em" }}>
                    Conectar con ISS PatyIA
                </Typography>
            </GlassToolbar>
            <DialogContent sx={{ px: 2.5, py: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Selecciona el entorno al que conectarte. Se abrirá el visor con <code>?conn=</code> apuntando a esa base real.
                </Typography>
                <Stack spacing={1.25}>
                    {(presets || []).map((p) => (
                        <Box
                            key={p.id}
                            component="button"
                            type="button"
                            onClick={() => onSelect?.(p)}
                            data-testid={`patyia-env-${p.id}`}
                            className="isa-sw-demo__patyia-env-card"
                            sx={{
                                textAlign: "left",
                                width: "100%",
                                cursor: "pointer",
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 2,
                                p: 1.5,
                                bgcolor: "transparent",
                                color: "inherit",
                                font: "inherit",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                transition: "border-color .15s, background-color .15s",
                                "&:hover": { borderColor: "#1e90ff", bgcolor: c.dark ? "rgba(30,144,255,0.08)" : "rgba(30,144,255,0.04)" },
                            }}
                        >
                            <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "10px", border: "1px solid", borderColor: "rgba(0,229,255,0.35)", bgcolor: "rgba(30,144,255,0.12)" }}>
                                <SwIcon icon={p.icon || "mdi:server"} size={22} ns={ns} aria-hidden />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{p.label}</Typography>
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>
                                    {p.base}
                                </Typography>
                                {p.description ? (
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        {p.description}
                                    </Typography>
                                ) : null}
                            </Box>
                            <Chip size="small" label="Conectar" color="primary" variant="outlined" />
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2 }}>
                <Button onClick={onClose} startIcon={<SwIcon icon="mdi:close" size={18} ns={ns} />}>
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
}