import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Box, IconButton, Tooltip, CircularProgress } = MaterialUI;

/** Vuelve a pedir config + spec al API remoto (GET /swagger/config.json). */
export function SwaggerReloadBtn({ onReload, busy = false, ns = "ISA" }) {
  if (!onReload) return null;

  return (
    <Box component="span" className="isa-sw-reload-btn" sx={{ display: "inline-flex", alignItems: "center" }}>
      <Tooltip title="Recargar documentación API" arrow>
        <span>
          <IconButton size="small" color="inherit" aria-label="Recargar documentación API" disabled={busy} onClick={() => onReload()}>
            {busy ? <CircularProgress size={16} color="inherit" /> : <SwIcon icon="mdi:refresh" size={18} ns={ns} />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
