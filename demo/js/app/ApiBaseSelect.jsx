import { inferSwaggerUrls } from "../../../src/lib/api/swagger-api.js";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";

const { Box, Button, TextField, Typography, Tooltip, Chip, Stack } = MaterialUI;

const TOOLBAR_INPUT_SX = {
  "& .MuiInput-underline:before": { borderBottom: "none" },
  "& .MuiInput-underline:after": { borderBottom: "none" },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottom: "none" },
  "& .MuiInputBase-root": { overflow: "hidden" },
};

/**
 * Selector de base API — solo URL libre.
 *
 * Quedan prohibidos los presets y la opción "Otro": la conexión es siempre
 * real contra una API viva (?conn= / ?api= / TextField). El viewer
 * no consume nunca JSONs quemados.
 */
export function ApiBaseSelect({ value, onChange, onConnect, busy, ns = "ISS", disabled = false }) {
  const urls = inferSwaggerUrls(value);
  return (
    <Box className="isa-sw-demo__api-base" sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
        <TextField
          className="isa-sw-server-field"
          size="small"
          variant="standard"
          hiddenLabel
          label={undefined}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="https://host…/api"
          fullWidth
          disabled={disabled}
          sx={{
            minWidth: { xs: 180, sm: 260 },
            flex: "1 1 260px",
            maxWidth: 520,
            ...TOOLBAR_INPUT_SX,
            "& .MuiInputBase-root": { height: 36 },
            "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem", py: 0.75 },
          }}
          slotProps={{
            input: {
              "aria-label": "Servidor API",
              disableUnderline: true,
              startAdornment: <SwIcon icon="mdi:api" size={16} ns={ns} aria-hidden style={{ marginRight: 6, opacity: 0.72 }} />,
            },
          }}
        />
        <Tooltip title="GET público /swagger/config.json" arrow>
          <Button size="small" variant="contained" disabled={!value?.trim() || busy || disabled} onClick={() => onConnect?.()} startIcon={<SwIcon icon="mdi:lan-connect" size={18} ns={ns} />}>
            Conectar
          </Button>
        </Tooltip>
      </Stack>
      {urls.get ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          <Chip size="small" label={`GET ${urls.config}`} variant="outlined" color="info" />
          <Chip size="small" label={`PUT ${urls.put}`} variant="outlined" color="warning" />
        </Typography>
      ) : null}
    </Box>
  );
}