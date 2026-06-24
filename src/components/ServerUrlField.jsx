import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { ServerScopeSelect } from "./ServerScopeSelect.jsx";

const { InputAdornment, Tooltip, IconButton, Box } = MaterialUI;

export function ServerUrlField({ ns = "ISA", compact = false, dense = false }) {
  const { serverBase, setServerBase, defaultBase, scopes } = useServerBase();

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
      <ServerScopeSelect value={serverBase} onChange={setServerBase} scopes={scopes} ns={ns} compact={compact} dense={dense} />
      {!dense && defaultBase && serverBase !== defaultBase ? (
        <Tooltip title={`Restaurar ${defaultBase}`} arrow>
          <IconButton size="small" aria-label="Restaurar servidor por defecto" onClick={() => setServerBase(defaultBase)} sx={{ flexShrink: 0 }}>
            <SwIcon icon="mdi:restore" size={16} ns={ns} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}
