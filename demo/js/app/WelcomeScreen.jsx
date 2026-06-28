import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import { GlassCard, NEON_COLORS } from "../../../src/lib/ui/glass.jsx";

const { Box, Typography, Button, Stack } = MaterialUI;

/** Pantalla inicial — AppShell + neon-glass; constructor o conexión manual. */
export function WelcomeScreen({ onOpenEditor, onConnectCustom, ns = "ISS" }) {
  return (
    <Box className="isa-sw-demo__welcome" sx={{ width: "100%", maxWidth: 680, px: { xs: 0.5, sm: 1 }, py: { xs: 2, sm: 3 } }}>
      <GlassCard tone="blue" accent={NEON_COLORS.blue} hover={false} sx={{ p: { xs: 2.5, sm: 3.5 }, textAlign: "center" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, mb: 1, borderRadius: "14px", border: "1px solid", borderColor: "rgba(0,229,255,0.35)", bgcolor: "rgba(30,144,255,0.12)", boxShadow: "0 0 20px rgba(30,144,255,0.18)" }}>
          <SwIcon icon="mdi:file-code-outline" size={32} ns={ns} aria-hidden />
        </Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: "0.02em" }}>IS-Swagger</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.5, maxWidth: 420, mx: "auto" }}>
          Documenta, prueba y exporta tu API. Para conectar a un host embebido use <code>?conn=</code> (base64url). Sin parámetros, abra el constructor o elija la API manualmente.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="center" alignItems="center" sx={{ mt: 3, width: "100%" }}>
          <Button variant="contained" color="primary" onClick={onOpenEditor} startIcon={<SwIcon icon="mdi:code-json" size={20} ns={ns} />}>
            Constructor JSON
          </Button>
          {onConnectCustom ? (
            <Button variant="outlined" onClick={onConnectCustom} startIcon={<SwIcon icon="mdi:lan-connect" size={20} ns={ns} />}>
              Otra API…
            </Button>
          ) : null}
        </Stack>
      </GlassCard>
    </Box>
  );
}
