import { SwIcon } from "../../lib/ui/sw-icon.jsx";

import { CUSTOM_SCOPE_ID, resolveScopePresetId, normalizeScopes } from "../../lib/lookup/server-scopes.js";

import { normalizeServerBase } from "../../lib/lookup/server-base.js";



const { Box, TextField, MenuItem, Stack, Typography } = MaterialUI;



const TOOLBAR_INPUT_SX = {

  "& .MuiInput-underline:before": { borderBottom: "none" },

  "& .MuiInput-underline:after": { borderBottom: "none" },

  "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottom: "none" },

  "& .MuiInputBase-root": { overflow: "hidden" },

};



/** Select de scope (JSON) + campo libre para URL de API. */
export function ServerScopeSelect({ value, onChange, scopes: scopesProp, ns = "ISA", compact = false, dense = false, fixed = false, id = "isa-sw-server-scope" }) {
  const scopes = normalizeScopes(scopesProp);
  const serverBase = normalizeServerBase(value);
  const presetId = scopes.length ? resolveScopePresetId(scopes, serverBase) : CUSTOM_SCOPE_ID;
  const toolbar = compact || dense;
  const fieldVariant = toolbar ? "standard" : "outlined";
  const showUrlField = !scopes.length || !toolbar || presetId === CUSTOM_SCOPE_ID;



  function pickScope(scopeId) {
    if (scopeId === CUSTOM_SCOPE_ID) return;
    const hit = scopes.find((s) => s.id === scopeId);
    if (hit) onChange?.(hit.base);
  }



  const inputH = dense ? 24 : 36;

  const inputFs = dense ? "0.7rem" : "0.8125rem";



  const urlField = showUrlField ? (

    <TextField

      className="isa-sw-server-field"

      size="small"

      variant={fieldVariant}

      hiddenLabel={toolbar}

      label={toolbar ? undefined : "Servidor API"}

      value={serverBase}

      onChange={(e) => onChange?.(e.target.value)}

      placeholder="https://host…/api"

      fullWidth={!compact}

      disabled={fixed}

      sx={{

        minWidth: compact ? 0 : { xs: 180, sm: 260 },

        flex: compact ? "1 1 6rem" : "1 1 260px",

        maxWidth: dense ? 160 : compact ? 220 : 420,

        ...(toolbar ? TOOLBAR_INPUT_SX : null),

        "& .MuiInputBase-root": { height: inputH },

        "& .MuiInputBase-input": { fontFamily: "ui-monospace, monospace", fontSize: inputFs, py: dense ? 0 : 0.75 },

      }}

      slotProps={{

        input: {

          "aria-label": "Servidor API",

          disableUnderline: toolbar,

          startAdornment: toolbar ? null : <SwIcon icon="mdi:api" size={16} ns={ns} aria-hidden style={{ marginRight: 6, opacity: 0.72 }} />,

        },

      }}

    />

  ) : null;



  if (!scopes.length) return urlField;



  const scopeSelect = (

    <TextField

      select

      size="small"

      variant={fieldVariant}

      hiddenLabel={toolbar}

      label={toolbar ? undefined : "Scope"}

      value={presetId}

      onChange={(e) => pickScope(e.target.value)}

      className="isa-sw-scope-select__preset"

      sx={{

        minWidth: dense ? 72 : compact ? 0 : 132,

        width: dense ? 84 : compact ? { xs: 92, sm: 108 } : 132,

        flexShrink: 0,

        ...(toolbar ? TOOLBAR_INPUT_SX : null),

        "& .MuiInputBase-root": { height: inputH },

        "& .MuiSelect-select": { fontSize: inputFs, py: dense ? 0 : undefined, display: "flex", alignItems: "center", gap: dense ? "6px" : "8px" },

      }}

      slotProps={{

        input: { disableUnderline: toolbar },

        select: { id: `${id}-preset`, "aria-label": "Scope API", MenuProps: { PaperProps: { className: "isa-sw-scope-menu" } } },

      }}

    >

      {scopes.map((s) => (

        <MenuItem key={s.id} value={s.id} dense={dense}>

          <Stack direction="row" spacing={dense ? 0.75 : 0.5} alignItems="center">

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



  return (

    <Box

      className={["isa-sw-scope-select", toolbar ? "isa-sw-scope-select--toolbar" : "", dense ? "isa-sw-scope-select--dense" : ""].filter(Boolean).join(" ")}

      sx={{ display: "inline-flex", alignItems: "center", gap: toolbar ? 1 : 0.75, minWidth: 0, flexShrink: 0, flex: !toolbar && compact ? "1 1 12rem" : undefined, maxWidth: !toolbar && compact ? 360 : undefined, overflow: "hidden" }}

    >

      {fixed ? null : scopeSelect}

      {urlField}

      {!toolbar && !compact && presetId === CUSTOM_SCOPE_ID && serverBase ? (

        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" }, maxWidth: 140, flexShrink: 0 }}>

          URL libre

        </Typography>

      ) : null}

    </Box>

  );

}

