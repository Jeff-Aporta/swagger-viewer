import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { CUSTOM_SCOPE_ID, matchScope, normalizeScopes, resolveScopePresetId } from "../lib/lookup/server-scopes.js";
import { normalizeServerBase } from "../lib/lookup/server-base.js";

const { Box, TextField, MenuItem, Tooltip, Stack, Typography } = MaterialUI;

/** Select de scope (JSON) + campo libre para URL de API. */
export function ServerScopeSelect({ value, onChange, scopes: scopesProp, ns = "ISA", compact = false, dense = false, id = "isa-sw-server-scope" }) {
  const scopes = normalizeScopes(scopesProp);
  const serverBase = normalizeServerBase(value);
  const presetId = scopes.length ? resolveScopePresetId(scopes, serverBase) : CUSTOM_SCOPE_ID;
  const matched = matchScope(scopes, serverBase);

  function pickScope(scopeId) {
    if (scopeId === CUSTOM_SCOPE_ID) return;
    const hit = scopes.find((s) => s.id === scopeId);
    if (hit) onChange?.(hit.base);
  }

  const inputH = dense ? 24 : 36;
  const inputFs = dense ? "0.7rem" : "0.8125rem";

  const urlField = (
    <TextField
      className="isa-sw-server-field"
      size="small"
      label={compact && !dense ? undefined : dense ? undefined : "Servidor API"}
      value={serverBase}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="https://host…/api"
      fullWidth={!compact}
      sx={{
        minWidth: compact ? 0 : { xs: 180, sm: 260 },
        flex: compact ? "1 1 6rem" : "1 1 260px",
        maxWidth: dense ? 160 : compact ? 220 : 420,
        "& .MuiInputBase-root": { height: inputH },
        "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: inputFs, py: dense ? 0 : 0.75 },
      }}
      slotProps={{
        input: {
          "aria-label": "Servidor API",
          startAdornment: dense ? null : <SwIcon icon="mdi:api" size={16} ns={ns} aria-hidden style={{ marginRight: 6, opacity: 0.72 }} />,
        },
      }}
    />
  );

  if (!scopes.length) return urlField;

  const scopeSelect = (
    <TextField
      select
      size="small"
      label={compact && !dense ? undefined : dense ? undefined : "Scope"}
      value={presetId}
      onChange={(e) => pickScope(e.target.value)}
      sx={{ minWidth: dense ? 72 : compact ? 0 : 132, width: dense ? 84 : compact ? { xs: 92, sm: 108 } : 132, flexShrink: 0, "& .MuiInputBase-root": { height: inputH }, "& .MuiSelect-select": { fontSize: inputFs, py: dense ? 0 : undefined } }}
      slotProps={{ select: { id: `${id}-preset`, "aria-label": "Scope API" } }}
    >
      {scopes.map((s) => (
        <MenuItem key={s.id} value={s.id} dense={dense}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <SwIcon icon={s.icon} size={dense ? 13 : 16} ns={ns} aria-hidden />
            <span>{dense || compact ? s.label.split(" ")[0] : s.label}</span>
          </Stack>
        </MenuItem>
      ))}
      <MenuItem value={CUSTOM_SCOPE_ID} dense={dense}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <SwIcon icon="mdi:pencil-outline" size={dense ? 13 : 16} ns={ns} aria-hidden />
          <span>{dense || compact ? "Otro" : "Personalizado…"}</span>
        </Stack>
      </MenuItem>
    </TextField>
  );

  if (dense) {
    return (
      <Tooltip title={matched ? `${matched.label} — ${serverBase}` : serverBase || "Servidor API"} arrow>
        <Box className="isa-sw-scope-select isa-sw-scope-select--dense" sx={{ display: "inline-flex", alignItems: "center", minWidth: 0, flexShrink: 0 }}>
          {scopeSelect}
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box className="isa-sw-scope-select" sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flex: compact ? "1 1 12rem" : undefined, maxWidth: compact ? 360 : undefined }}>
      {scopeSelect}
      {compact ? (
        <Tooltip title={matched ? `${matched.label} — ${serverBase}` : serverBase || "Escriba la base /api"} arrow>
          {urlField}
        </Tooltip>
      ) : (
        urlField
      )}
      {!compact && presetId === CUSTOM_SCOPE_ID && serverBase ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" }, maxWidth: 140, flexShrink: 0 }}>
          URL libre
        </Typography>
      ) : null}
    </Box>
  );
}
