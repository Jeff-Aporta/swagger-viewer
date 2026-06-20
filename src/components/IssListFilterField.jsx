import {
  ISS_LIST_FILTER_EXT,
  ISS_LIST_FILTER_QUERY_PARAM,
  bagFromFilterValue,
  emptyIssFilter,
  encodeIssFilterB64,
  decodeIssFilterB64,
  parseIssFilterQueryValue,
  parseIssFilterRaw,
  serializeIssFilter,
  serializeIssFilterQuery,
  sortOptions,
  validateIssFilter,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "../lib/iss-list-filter.js";
import { SwIcon } from "../lib/sw-icon.jsx";

const { useState, useMemo, useEffect } = React;
const {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  MenuItem,
  Divider,
  InputAdornment,
  IconButton,
  Tooltip,
} = MaterialUI;

function eqFieldInput(def, name, value, disabled, onChange) {
  const t = def.type || "string";
  if (def.enum?.length) {
    return (
      <TextField select size="small" fullWidth disabled={disabled} label={def.label || name} value={value ?? ""} onChange={(e) => onChange(e.target.value)} helperText={def.description || ""}>
        <MenuItem value="">(vacío)</MenuItem>
        {def.enum.map((opt) => (
          <MenuItem key={String(opt)} value={String(opt)}>{def.enumLabels?.[opt] ?? String(opt)}</MenuItem>
        ))}
      </TextField>
    );
  }
  if (t === "boolean") {
    return (
      <TextField select size="small" fullWidth disabled={disabled} label={def.label || name} value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""} onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value === "true")} helperText={def.description || ""}>
        <MenuItem value="">(vacío)</MenuItem>
        <MenuItem value="true">true</MenuItem>
        <MenuItem value="false">false</MenuItem>
      </TextField>
    );
  }
  return (
    <TextField size="small" fullWidth disabled={disabled} type={t === "integer" || t === "number" ? "number" : "text"} label={def.label || name} value={value ?? ""} onChange={(e) => onChange(e.target.value)} helperText={def.description || ""} inputProps={{ min: def.minimum, max: def.maximum }} />
  );
}

export function IssListFilterField({ param, value, onChange, disabled, ns = "ISA" }) {
  const ext = param?.[ISS_LIST_FILTER_EXT] || {};
  const [open, setOpen] = useState(false);
  const [bag, setBag] = useState(() => bagFromFilterValue(value, ext));
  const [err, setErr] = useState("");

  const eqEntries = useMemo(() => Object.entries(ext.eq || {}), [ext]);
  const sorts = useMemo(() => sortOptions(ext), [ext]);

  useEffect(() => {
    if (!open) setBag(bagFromFilterValue(value, ext));
  }, [value, ext, open]);

  const summary = value?.trim() ? value : "(sin filtro)";
  const previewQuery = useMemo(() => {
    const r = validateIssFilter(
      { search: bag.search || undefined, limit: bag.limit, offset: bag.offset, sort: bag.sort || undefined, eq: bag.eq },
      ext,
    );
    return r.ok ? serializeIssFilterQuery(bag, ext) : "";
  }, [bag, ext]);
  const previewJson = useMemo(() => {
    const r = validateIssFilter(
      { search: bag.search || undefined, limit: bag.limit, offset: bag.offset, sort: bag.sort || undefined, eq: bag.eq },
      ext,
    );
    return r.ok ? serializeIssFilter(bag, ext) || "{}" : "";
  }, [bag, ext]);

  function apply() {
    const payload = {
      search: bag.search || undefined,
      limit: bag.limit === "" ? undefined : Number(bag.limit),
      offset: bag.offset === "" ? undefined : Number(bag.offset),
      sort: bag.sort || undefined,
      eq: bag.eq,
    };
    const r = validateIssFilter(payload, ext);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    onChange?.(serializeIssFilterQuery(bag, ext));
    setErr("");
    setOpen(false);
  }

  function clearFilter() {
    const base = emptyIssFilter(ext.defaults);
    setBag(base);
    onChange?.("");
    setErr("");
    setOpen(false);
  }

  function loadExample() {
    const ex = param?.schema?.example || param?.example;
    if (!ex) return;
    try {
      let raw = typeof ex === "string" ? ex : JSON.stringify(ex);
      if (!raw.trim().startsWith("{")) raw = decodeIssFilterB64(raw);
      const p = parseIssFilterRaw(raw);
      if (p.ok) setBag(bagFromFilterValue(encodeIssFilterB64(raw), ext));
    } catch { /* ignore */ }
  }

  return (
    <>
      <Box className="isa-sw-iss-filter-field" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography variant="caption" color="text.secondary" component="div">
          {param?.description?.split(".")[0] || `Filtro ISS (query \`${ISS_LIST_FILTER_QUERY_PARAM}\` en Base64)`}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            label={`${param?.name || ISS_LIST_FILTER_QUERY_PARAM} (Base64)`}
            value={summary}
            InputProps={{
              readOnly: true,
              endAdornment: value ? (
                <InputAdornment position="end">
                  <Tooltip title="Limpiar filtro">
                    <IconButton size="small" disabled={disabled} onClick={clearFilter} aria-label="Limpiar filtro">
                      <SwIcon icon="mdi:close-circle-outline" size={18} ns={ns} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button variant="outlined" size="small" disabled={disabled} onClick={() => { setErr(""); setOpen(true); }} sx={{ flexShrink: 0, mt: 0.25 }} startIcon={<SwIcon icon="mdi:tune-variant" size={18} ns={ns} />}>
            Configurar
          </Button>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth className="isa-sw-iss-filter-dialog">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
          <SwIcon icon="mdi:filter-cog-outline" size={22} ns={ns} />
          Filtro ISS — {param?.name || ISS_LIST_FILTER_QUERY_PARAM}
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {err ? <Alert severity="error">{err}</Alert> : null}
          {ext.searchHint ? (
            <Alert severity="info" icon={<SwIcon icon="mdi:magnify" size={20} ns={ns} />}>{ext.searchHint}</Alert>
          ) : null}

          <TextField size="small" fullWidth disabled={disabled} label="search — texto libre" value={bag.search} onChange={(e) => setBag((p) => ({ ...p, search: e.target.value }))} helperText="Máx. 200 caracteres. Semántica depende del endpoint." inputProps={{ maxLength: 200 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField size="small" type="number" disabled={disabled} label="limit" value={bag.limit} onChange={(e) => setBag((p) => ({ ...p, limit: e.target.value }))} helperText={`1–${MAX_LIMIT} (default ${ext.defaults?.limit ?? DEFAULT_LIMIT})`} inputProps={{ min: 1, max: MAX_LIMIT }} />
            <TextField size="small" type="number" disabled={disabled} label="offset" value={bag.offset} onChange={(e) => setBag((p) => ({ ...p, offset: e.target.value }))} helperText="Paginación — desde 0" inputProps={{ min: 0 }} />
          </Box>

          {sorts.length > 1 ? (
            <TextField select size="small" fullWidth disabled={disabled} label="sort — orden" value={bag.sort} onChange={(e) => setBag((p) => ({ ...p, sort: e.target.value }))} helperText="Prefijo - en JSON = descendente">
              {sorts.map((o) => <MenuItem key={o.value || "__none"} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          ) : (
            <TextField size="small" fullWidth disabled={disabled} label="sort" value={bag.sort} onChange={(e) => setBag((p) => ({ ...p, sort: e.target.value }))} helperText="Campo de orden; prefijo - = descendente" />
          )}

          {eqEntries.length ? (
            <>
              <Divider />
              <Typography variant="subtitle2">eq — igualdad exacta (AND)</Typography>
              {eqEntries.map(([key, def]) => (
                <Box key={key}>{eqFieldInput(def, key, bag.eq?.[key], disabled, (v) => setBag((p) => ({ ...p, eq: { ...p.eq, [key]: v } })))}</Box>
              ))}
            </>
          ) : null}

          <Box
            className="isa-sw-iss-filter-preview"
            sx={{
              p: 1.25,
              mb: 1.5,
              minHeight: "4.5rem",
              borderRadius: 1,
              bgcolor: "action.hover",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.8rem",
              lineHeight: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
              Vista previa — query <Box component="code" sx={{ fontFamily: "inherit" }}>{ISS_LIST_FILTER_QUERY_PARAM}=</Box>
            </Typography>
            <Box component="pre" sx={{ m: 0, mb: previewJson && previewJson !== "{}" ? 1 : 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "text.primary" }}>
              {previewQuery || "(vacío)"}
            </Box>
            {previewJson && previewJson !== "{}" ? (
              <>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  JSON decodificado
                </Typography>
                <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "text.primary" }}>
                  {previewJson}
                </Box>
              </>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {(param?.schema?.example || param?.example) ? (
              <Button size="small" disabled={disabled} onClick={loadExample}>Cargar ejemplo</Button>
            ) : null}
            <Button size="small" color="inherit" disabled={disabled} onClick={clearFilter}>Limpiar</Button>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="small" variant="contained" disabled={disabled} onClick={apply}>Aplicar filtro</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function isIssListFilterParam(p) {
  return p?.in === "query" && p?.name === ISS_LIST_FILTER_QUERY_PARAM && !!p?.[ISS_LIST_FILTER_EXT];
}
