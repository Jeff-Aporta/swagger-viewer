import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { Box, IconButton, Tooltip, CircularProgress } = MaterialUI;

/** Vuelve a pedir config + spec al API remoto (GET /swagger/config.json). */
export function SwaggerReloadBtn({ onReload, busy = false, ns = "ISA", serverBase }) {
  if (!onReload) return null;
  const title = serverBase ? `Refrescar ${serverBase}` : "Refrescar documentación API";
  const aria = serverBase ? `Refrescar documentación desde ${serverBase}` : "Refrescar documentación API";

  return (
    <Box component="span" className="isa-sw-reload-btn" sx={{ display: "inline-flex", alignItems: "center" }}>
      <Tooltip title={title} arrow>
        <span>
          <IconButton size="small" color="inherit" aria-label={aria} disabled={busy} onClick={() => onReload()}>
            {busy ? <CircularProgress size={16} color="inherit" /> : <SwIcon icon="mdi:refresh" size={18} ns={ns} />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
