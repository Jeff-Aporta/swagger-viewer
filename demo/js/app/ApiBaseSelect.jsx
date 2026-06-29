import { normalizeApiBase, inferSwaggerUrls } from "../../../src/lib/api/swagger-api.js";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";

const { Box, Button, Typography, Tooltip, Chip, Stack, TextField } = MaterialUI;

const LS_KEY = "isa-sw-demo-api-base";

const TOOLBAR_INPUT_SX = {
  "& .MuiInput-underline:before": { borderBottom: "none" },
  "& .MuiInput-underline:after": { borderBottom: "none" },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottom: "none" },
};

export function readStoredApiBase() {
  try {
    const saved = normalizeApiBase(localStorage.getItem(LS_KEY) || "");
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return "";
}

export function storeApiBase(base) {
  try {
    const n = normalizeApiBase(base);
    if (n) localStorage.setItem(LS_KEY, n);
    else localStorage.removeItem(LS_KEY);
    return n;
  } catch {
    return normalizeApiBase(base);
  }
}

/** Campo base API + conectar; infiere GET/PUT swagger (override vía pathOverrides). */
export function ApiBaseSelect({ value, onChange, onConnect, busy, ns = "ISA", pathOverrides = null }) {
  const urls = inferSwaggerUrls(value, pathOverrides);

  return (
    <Box className="isa-sw-demo__api-base" sx={{ px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
        <TextField
          className="isa-sw-server-field"
          size="small"
          variant="standard"
          hiddenLabel
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="https://host…/api"
          fullWidth
          sx={{
            minWidth: 0,
            flex: "1 1 12rem",
            maxWidth: 420,
            ...TOOLBAR_INPUT_SX,
            "& .MuiInputBase-root": { height: 36 },
            "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem" },
          }}
          slotProps={{
            input: {
              "aria-label": "Servidor API",
              disableUnderline: true,
              startAdornment: <SwIcon icon="mdi:api" size={16} ns={ns} aria-hidden style={{ marginRight: 6, opacity: 0.72 }} />,
            },
          }}
        />
        <Tooltip title={`GET ${urls.pathRel?.config || "/system/swagger/config.json"}`} arrow>
          <Button size="small" variant="contained" disabled={!value?.trim() || busy} onClick={() => onConnect?.()} startIcon={<SwIcon icon="mdi:lan-connect" size={18} ns={ns} />}>
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
