import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import { GlassCard, NEON_COLORS } from "../../../src/lib/ui/glass.jsx";
import { encodeConnParam, resolveConnBrand } from "../../../src/lib/api/conn-config.js";
import { ISS_PATYIA_PRESETS } from "../../../src/lib/api/api-presets.js";
import { normalizeApiBase } from "../../../src/lib/api/swagger-api.js";
import { PatyIaEnvDialog } from "./PatyIaEnvDialog.jsx";

const { useState } = React;
const { Box, Typography, Button, Stack, TextField, Divider } = MaterialUI;

/**
 * Pantalla inicial — única vía: conexión real (?conn=).
 *
 *  • Botón "Conectar con ISS PatyIA" → modal Local/Prod (siempre URL real).
 *  • Bloque "Otra API" → input URL libre + botón Cargar (?conn= con apiBase).
 *
 * Prohibido quemar JSONs o simular conexiones.
 */
export function WelcomeScreen({ ns = "ISS" }) {
    const [envOpen, setEnvOpen] = useState(false);
    const [customBase, setCustomBase] = useState("");

    function openWithConn(conn) {
        const params = new URLSearchParams(location.search);
        const s = params.get("s");
        const url = new URL(location.href);
        url.search = "";
        url.searchParams.set("conn", encodeConnParam(conn));
        if (s) url.searchParams.set("s", s);
        location.assign(url.toString());
    }

    function connectPatyIa(preset) {
        setEnvOpen(false);
        if (!preset) return;
        const conn = {
            apiBase: preset.base,
            auto: true,
            embed: true,
            fixedServer: true,
            title: `ISS PatyIA · ${preset.label}`,
            icon: preset.icon || "mdi:robot-happy-outline",
        };
        openWithConn(conn);
    }

    function connectCustom() {
        const base = normalizeApiBase(customBase.trim());
        if (!base) return;
        const conn = {
            apiBase: base,
            auto: true,
            embed: true,
            fixedServer: true,
            title: resolveConnBrand({ title: "ISS" })?.title || "ISS",
            icon: "mdi:server",
        };
        openWithConn(conn);
    }

    return (
        <Box className="isa-sw-demo__welcome" sx={{ width: "100%", maxWidth: 720, px: { xs: 0.5, sm: 1 }, py: { xs: 2, sm: 3 } }}>
            <GlassCard tone="blue" accent={NEON_COLORS.blue} hover={false} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Box sx={{ textAlign: "center" }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, mb: 1, borderRadius: "14px", border: "1px solid", borderColor: "rgba(0,229,255,0.35)", bgcolor: "rgba(30,144,255,0.12)", boxShadow: "0 0 20px rgba(30,144,255,0.18)" }}>
                        <SwIcon icon="mdi:robot-happy-outline" size={32} ns={ns} aria-hidden />
                    </Box>
                    <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: "0.02em" }}>IS-Swagger</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.5, maxWidth: 460, mx: "auto" }}>
                        Documenta, prueba y exporta la API ISS PatyIA. Conexión siempre real vía <code>?conn=</code>; sin simulaciones ni JSONs quemados.
                    </Typography>
                </Box>

                <Stack direction="column" spacing={1.5} sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setEnvOpen(true)}
                        startIcon={<SwIcon icon="mdi:lan-connect" size={20} ns={ns} />}
                        data-testid="welcome-connect-patyia"
                        size="large"
                        fullWidth
                    >
                        Conectar con ISS PatyIA
                    </Button>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, my: 0.5 }}>
                        <Divider sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">o</Typography>
                        <Divider sx={{ flex: 1 }} />
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Otra API ISS</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.5 }}>
                        Pega la URL base (…/api/) de cualquier ISS para cargar su spec real.
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="https://otro-host.../api"
                            value={customBase}
                            onChange={(e) => setCustomBase(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") connectCustom();
                            }}
                            inputProps={{ "data-testid": "welcome-custom-api-base", "aria-label": "URL base API ISS" }}
                            sx={{
                                "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" },
                            }}
                        />
                        <Button
                            variant="contained"
                            color="info"
                            disabled={!customBase.trim()}
                            onClick={connectCustom}
                            startIcon={<SwIcon icon="mdi:cloud-download-outline" size={18} ns={ns} />}
                            data-testid="welcome-custom-load"
                        >
                            Cargar
                        </Button>
                    </Stack>
                </Stack>
            </GlassCard>

            <PatyIaEnvDialog
                open={envOpen}
                onClose={() => setEnvOpen(false)}
                onSelect={connectPatyIa}
                presets={ISS_PATYIA_PRESETS}
                ns={ns}
            />
        </Box>
    );
}