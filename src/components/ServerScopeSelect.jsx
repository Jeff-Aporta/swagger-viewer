import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { CUSTOM_SCOPE_ID, matchScope, normalizeScopes, resolveScopePresetId } from "../lib/lookup/server-scopes.js";
import { normalizeServerBase } from "../lib/lookup/server-base.js";

const { Box, TextField, MenuItem, Tooltip, Stack, Typography } = MaterialUI;

/** Select de scope (JSON) + campo libre para URL de API. */
export function ServerScopeSelect({ value, onChange, scopes: scopesProp, ns = "ISA", compact = false, id = "isa-sw-server-scope" }) {
  const scopes = normalizeScopes(scopesProp);
  const serverBase = normalizeServerBase(value);
  const presetId = scopes.length ? resolveScopePresetId(scopes, serverBase) : CUSTOM_SCOPE_ID;
  const matched = matchScope(scopes, serverBase);

  function pickScope(scopeId) {
    if (scopeId === CUSTOM_SCOPE_ID) return;
    const hit = scopes.find((s) => s.id === scopeId);
    if (hit) onChange?.(hit.base);
  }

  const urlField = (
    <TextField
      className="isa-sw-server-field"
      size="small"
      label={compact ? undefined : "Servidor API"}
      value={serverBase}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder="https://host…/api"
      fullWidth={!compact}
      sx={{
        minWidth: compact ? 0 : { xs: 180, sm: 260 },
        flex: compact ? "1 1 6rem" : "1 1 260px",
        maxWidth: compact ? 220 : 420,
        "& .MuiInputBase-root": { height: 36 },
        "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem", py: 0.75 },
      }}
      slotProps={{
        input: {
          "aria-label": "Servidor API",
          startAdornment: <SwIcon icon="mdi:api" size={16} ns={ns} aria-hidden style={{ marginRight: 6, opacity: 0.72 }} />,
        },
      }}
    />
  );

  if (!scopes.length) return urlField;

  return (
    <Box className="isa-sw-scope-select" sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, flex: compact ? "1 1 12rem" : undefined, maxWidth: compact ? 360 : undefined }}>
      <TextField
        select
        size="small"
        label={compact ? undefined : "Scope"}
        value={presetId}
        onChange={(e) => pickScope(e.target.value)}
        sx={{ minWidth: compact ? 0 : 132, width: compact ? { xs: 92, sm: 108 } : 132, flexShrink: 0, "& .MuiInputBase-root": { height: 36 } }}
        slotProps={{ select: { id: `${id}-preset`, "aria-label": "Scope API" } }}
      >
        {scopes.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <SwIcon icon={s.icon} size={16} ns={ns} aria-hidden />
              <span>{compact ? s.label.split(" ")[0] : s.label}</span>
            </Stack>
          </MenuItem>
        ))}
        <MenuItem value={CUSTOM_SCOPE_ID}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <SwIcon icon="mdi:pencil-outline" size={16} ns={ns} aria-hidden />
            <span>{compact ? "Otro" : "Personalizado…"}</span>
          </Stack>
        </MenuItem>
      </TextField>
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
