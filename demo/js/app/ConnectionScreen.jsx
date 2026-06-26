import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import { GlassCard, NEON_COLORS } from "../../../src/lib/ui/glass.jsx";
import { DemoShell } from "./DemoShell.jsx";

const { Box, Typography, Button, Alert, CircularProgress } = MaterialUI;

/** Pantalla de carga/error con AppShell + glass (misma estética que WelcomeScreen). */
export function ConnectionScreen({ title, icon, ns = "ISS", busy = false, error = "", subtitle = "", onRetry = null }) {
  const label = busy ? subtitle || "Cargando documentación API…" : error ? "" : subtitle;
  return (
    <DemoShell ns={ns}>
      <Box className="isa-sw-demo__welcome" sx={{ width: "100%", maxWidth: 680, px: { xs: 0.5, sm: 1 }, py: { xs: 2, sm: 3 } }}>
        <GlassCard tone="blue" accent={NEON_COLORS.blue} hover={false} sx={{ p: { xs: 2.5, sm: 3.5 }, textAlign: "center" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, mb: 1, borderRadius: "14px", border: "1px solid", borderColor: "rgba(0,229,255,0.35)", bgcolor: "rgba(30,144,255,0.12)", boxShadow: "0 0 20px rgba(30,144,255,0.18)" }}>
            <SwIcon icon={icon || "mdi:file-code-outline"} size={32} ns={ns} aria-hidden />
          </Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: "0.02em" }}>{title}</Typography>
          {busy ? (
            <>
              <CircularProgress size={28} sx={{ mt: 2.5 }} />
              {label ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.5 }}>{label}</Typography> : null}
            </>
          ) : null}
          {!busy && error ? (
            <>
              <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>{error}</Alert>
              {onRetry ? (
                <Button variant="outlined" sx={{ mt: 2 }} onClick={onRetry} startIcon={<SwIcon icon="mdi:lan-connect" size={18} ns={ns} />}>
                  Reintentar conexión
                </Button>
              ) : null}
            </>
          ) : null}
          {!busy && !error && label ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.5 }}>{label}</Typography> : null}
        </GlassCard>
      </Box>
    </DemoShell>
  );
}
