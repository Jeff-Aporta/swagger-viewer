import { SwIcon } from "../lib/sw-icon.jsx";
import { useServerBase } from "../context/ServerBaseContext.jsx";

const { TextField, InputAdornment, Tooltip, IconButton } = MaterialUI;

export function ServerUrlField({ ns = "ISA", compact = false }) {
  const { serverBase, setServerBase, defaultBase } = useServerBase();

  return (
    <TextField
      className="isa-sw-server-field"
      size="small"
      label={compact ? undefined : "Servidor API"}
      value={serverBase}
      onChange={(e) => setServerBase(e.target.value)}
      placeholder={defaultBase || "http://localhost:5502/api"}
      sx={{
        minWidth: compact ? 0 : { xs: 180, sm: 300 },
        maxWidth: compact ? 340 : 420,
        width: compact ? { xs: 140, sm: 260, md: 300 } : undefined,
        flex: compact ? "1 1 8rem" : "1 1 260px",
        "& .MuiInputBase-root": { height: 36 },
        "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem", py: 0.75 },
      }}
      slotProps={{
        input: {
          "aria-label": "Servidor API",
          startAdornment: (
            <InputAdornment position="start">
              <SwIcon icon="mdi:web" size={16} ns={ns} aria-hidden />
            </InputAdornment>
          ),
          endAdornment: defaultBase && serverBase !== defaultBase ? (
            <InputAdornment position="end">
              <Tooltip title={`Restaurar ${defaultBase}`} arrow>
                <IconButton size="small" edge="end" aria-label="Restaurar servidor por defecto" onClick={() => setServerBase(defaultBase)}>
                  <SwIcon icon="mdi:restore" size={16} ns={ns} />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
}
