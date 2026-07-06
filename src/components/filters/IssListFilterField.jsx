import {
  ISS_LIST_FILTER_EXT,
  ISS_LIST_FILTER_QUERY_PARAM,
  bagFromFilterValue,
  emptyIssFilter,
  serializeIssFilterQuery,
  validateIssFilter,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  sortColumnOptions,
  parseSortParts,
  formatSortValue,
  isIssListFilterParam,
} from "../../lib/filter/iss-list-filter.js";
import { IssDistinctCompoundEqField, IssDistinctEqField } from "./IssDistinctEqField.jsx";
import { IssFusedSelectField } from "./IssFusedSelectField.jsx";
import { IssFilterJsonDialog, applyEditableJsonToFilter, filterValueToEditableJson } from "../dialogs/IssFilterJsonDialog.jsx";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import {
  issFilterDialogProps,
  issFilterDialogHeader,
  loginFormContentSx,
  loginFormActionsSx,
} from "../../lib/ui/glass-filter-dialog.js";

const { useState, useMemo, useEffect } = React;
const {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Tooltip,
} = MaterialUI;

function buildEqSections(eqEntries) {
  const compoundRendered = new Set();
  const compoundGroups = [];
  const singles = [];

  for (const [key, def] of eqEntries) {
    const dl = def.distinctLookup;
    if (dl?.compound && dl.columns?.length) {
      const gid = dl.columns.join("+");
      let g = compoundGroups.find((x) => x.id === gid);
      if (!g) {
        g = { id: gid, columns: dl.columns, distinctLookup: dl, fields: [] };
        compoundGroups.push(g);
      }
      g.fields.push({ key, def });
      compoundRendered.add(key);
    }
  }
  for (const [key, def] of eqEntries) {
    if (compoundRendered.has(key)) continue;
    singles.push([key, def]);
  }
  return { compoundGroups, singles };
}

function eqFieldInput(def, name, value, disabled, onChange) {
  const t = def.type || "string";
  if (def.enum?.length) {
    return (
      <IssFusedSelectField
        disabled={disabled}
        label={def.label || name}
        value={value ?? ""}
        onChange={onChange}
        helperText={def.description || ""}
        options={def.enum.map((opt) => ({ value: String(opt), label: def.enumLabels?.[opt] ?? String(opt) }))}
      />
    );
  }
  if (t === "boolean") {
    return (
      <IssFusedSelectField
        disabled={disabled}
        label={def.label || name}
        value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""}
        onChange={(v) => onChange(v === "" ? "" : v === "true")}
        helperText={def.description || ""}
        options={[
          { value: "true", label: "true" },
          { value: "false", label: "false" },
        ]}
      />
    );
  }
  return (
    <TextField size="small" fullWidth disabled={disabled} type={t === "integer" || t === "number" ? "number" : "text"} label={def.label || name} value={value ?? ""} onChange={(e) => onChange(e.target.value)} helperText={def.description || ""} inputProps={{ min: def.minimum, max: def.maximum }} />
  );
}

export function IssListFilterField({
  param,
  value,
  onChange,
  disabled,
  ns = "ISA",
  endpointLabel = "",
  authEnabled = false,
  onNeedLogin,
}) {
  const ext = param?.[ISS_LIST_FILTER_EXT] || {};
  const listPath = ext.listPath || "/conversaciones";
  const [open, setOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [bag, setBag] = useState(() => bagFromFilterValue(value, ext));
  const [err, setErr] = useState("");
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonErr, setJsonErr] = useState("");

  const hasB64Filter = !!String(value || "").trim();

  const eqEntries = useMemo(() => Object.entries(ext.eq || {}), [ext]);
  const eqSections = useMemo(() => buildEqSections(eqEntries), [eqEntries]);
  const sortColumns = useMemo(() => sortColumnOptions(ext), [ext]);
  const sortParts = useMemo(() => parseSortParts(bag.sort), [bag.sort]);

  function setSortField(field) {
    setBag((p) => ({ ...p, sort: formatSortValue(field, parseSortParts(p.sort).dir || "desc") }));
  }

  function setSortDir(dir) {
    setBag((p) => {
      const { field } = parseSortParts(p.sort);
      const col = field || sortColumns[0]?.value || "iconversacion";
      return { ...p, sort: formatSortValue(col, dir) };
    });
  }

  useEffect(() => {
    if (!open && !jsonOpen) setBag(bagFromFilterValue(value, ext));
  }, [value, ext, open, jsonOpen]);

  const dialogTitle = endpointLabel
    ? `Filtro · ${endpointLabel}`
    : `Filtro query \`${param?.name || ISS_LIST_FILTER_QUERY_PARAM}\``;

  function onManualChange(raw) {
    const next = String(raw ?? "");
    onChange?.(next.trim());
    setErr("");
    setJsonErr("");
  }

  function openJsonModal() {
    if (!hasB64Filter) return;
    const draft = filterValueToEditableJson(value);
    if (!draft) {
      setJsonErr("No se pudo decodificar el filtro B64.");
      return;
    }
    setJsonDraft(draft);
    setJsonErr("");
    setJsonOpen(true);
  }

  function applyJsonModal() {
    const r = applyEditableJsonToFilter(jsonDraft, ext);
    if (!r.ok) {
      setJsonErr(r.error);
      return;
    }
    setJsonErr("");
    onChange?.(r.value);
    setJsonOpen(false);
  }

  function apply() {
    const payload = {
      search: bag.search || undefined,
      limit: bag.limit === "" ? undefined : Number(bag.limit),
      offset: bag.offset === "" ? undefined : Number(bag.offset),
      sort: bag.sort?.trim() || undefined,
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

  function resetBag() {
    setBag(emptyIssFilter(ext.defaults));
    setErr("");
  }

  function clearFilter() {
    resetBag();
    onChange?.("");
    setOpen(false);
  }

  return (
    <>
      <Box className="isa-sw-iss-filter-field" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            size="small"
            fullWidth
            disabled={disabled}
            label="Filtro B64"
            value={value || ""}
            placeholder="Base64 o JSON del filtro"
            onChange={(e) => onManualChange(e.target.value)}
            sx={{ flex: 1, minWidth: 0 }}
            InputProps={{
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
          <Tooltip title={hasB64Filter ? "Ver y editar JSON del filtro" : "Sin filtro B64"}>
            <span>
              <IconButton
                className="isa-sw-iss-filter-json-btn"
                size="small"
                disabled={disabled || !hasB64Filter}
                onClick={openJsonModal}
                aria-label="Ver JSON del filtro"
                sx={{ flexShrink: 0, color: hasB64Filter ? "primary.main" : "text.disabled" }}
              >
                <SwIcon icon="mdi:code-json" size={18} ns={ns} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Configurar filtro">
            <span>
              <IconButton
                className="isa-sw-iss-filter-config-btn"
                size="small"
                disabled={disabled}
                onClick={() => { setErr(""); setOpen(true); }}
                aria-label="Configurar filtro"
                sx={{ flexShrink: 0, color: "text.secondary" }}
              >
                <SwIcon icon="mdi:tune-variant" size={18} ns={ns} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        {jsonErr && !jsonOpen ? <Alert severity="error" sx={{ py: 0.25 }}>{jsonErr}</Alert> : null}
        {err && !open ? <Alert severity="error" sx={{ py: 0.25 }}>{err}</Alert> : null}
      </Box>

      <IssFilterJsonDialog
        open={jsonOpen}
        onClose={() => setJsonOpen(false)}
        jsonText={jsonDraft}
        onJsonChange={setJsonDraft}
        onApply={applyJsonModal}
        error={jsonErr}
        disabled={disabled}
        title={dialogTitle}
        ns={ns}
      />

      <Dialog {...issFilterDialogProps({ open, onClose: () => setOpen(false) })}>
        {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title: dialogTitle })}
        <DialogContent
          sx={{
            ...loginFormContentSx(),
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: "min(80vh, 640px)",
            overflowY: "auto",
          }}
        >
          <Typography variant="caption" color="text.secondary" component="div">
            Parámetro <code>{param?.name || ISS_LIST_FILTER_QUERY_PARAM}</code> (JSON Base64)
          </Typography>
          {err ? <Alert severity="error">{err}</Alert> : null}
          {ext.searchHint ? (
            <Alert severity="info" icon={<SwIcon icon="mdi:magnify" size={20} ns={ns} />}>{ext.searchHint}</Alert>
          ) : null}

          <TextField size="small" fullWidth disabled={disabled} label="search — texto libre" value={bag.search} onChange={(e) => setBag((p) => ({ ...p, search: e.target.value }))} helperText="Máx. 200 caracteres. Semántica depende del endpoint." inputProps={{ maxLength: 200 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField size="small" type="number" disabled={disabled} label="limit" value={bag.limit} onChange={(e) => setBag((p) => ({ ...p, limit: e.target.value }))} helperText={`1–${MAX_LIMIT} (default ${ext.defaults?.limit ?? DEFAULT_LIMIT})`} inputProps={{ min: 1, max: MAX_LIMIT }} />
            <TextField size="small" type="number" disabled={disabled} label="offset" value={bag.offset} onChange={(e) => setBag((p) => ({ ...p, offset: e.target.value }))} helperText="Paginación — desde 0" inputProps={{ min: 0 }} />
          </Box>

          {sortColumns.length > 0 ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr minmax(9rem, 10.5rem)", gap: 1.5, alignItems: "start" }}>
              <IssFusedSelectField
                disabled={disabled}
                label="ordenar por"
                value={sortParts.field || sortColumns[0]?.value || ""}
                onChange={setSortField}
                helperText="Columna del listado"
                allowEmpty={false}
                options={sortColumns.map((o) => ({ value: o.value, label: o.label }))}
              />
              <IssFusedSelectField
                disabled={disabled}
                label="sentido"
                value={sortParts.dir || "desc"}
                onChange={setSortDir}
                allowEmpty={false}
                options={[
                  { value: "asc", label: "Ascendente" },
                  { value: "desc", label: "Descendente" },
                ]}
              />
            </Box>
          ) : null}

          {eqSections.compoundGroups.length || eqSections.singles.length ? (
            <>
              <Divider />
              <Typography variant="subtitle2">igualdad exacta</Typography>
              {eqSections.compoundGroups.map((g) => (
                <IssDistinctCompoundEqField
                  key={g.id}
                  listPath={listPath}
                  distinctLookup={g.distinctLookup}
                  fields={g.fields}
                  values={bag.eq}
                  onApply={(patch) => setBag((p) => ({ ...p, eq: { ...p.eq, ...patch } }))}
                  disabled={disabled}
                  ns={ns}
                  authEnabled={authEnabled}
                  onNeedLogin={onNeedLogin}
                />
              ))}
              {eqSections.singles.map(([key, def]) => {
                const dl = def.distinctLookup;
                if (dl?.columns?.length && listPath) {
                  return (
                    <IssDistinctEqField
                      key={key}
                      listPath={listPath}
                      fieldKey={key}
                      distinctLookup={dl}
                      def={def}
                      value={bag.eq?.[key] ?? ""}
                      onChange={(v) => setBag((p) => ({ ...p, eq: { ...p.eq, [key]: v } }))}
                      disabled={disabled}
                      ns={ns}
                      authEnabled={authEnabled}
                      onNeedLogin={onNeedLogin}
                    />
                  );
                }
                return (
                  <Box key={key}>{eqFieldInput(def, key, bag.eq?.[key], disabled, (v) => setBag((p) => ({ ...p, eq: { ...p.eq, [key]: v } })))}</Box>
                );
              })}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ ...loginFormActionsSx(), justifyContent: "space-between", gap: 1 }}>
          <Button size="small" disabled={disabled} onClick={resetBag} startIcon={<SwIcon icon="mdi:restore" size={18} ns={ns} />}>
            Reiniciar filtro
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="small" variant="contained" disabled={disabled} onClick={apply}>Aplicar filtro</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}

export { isIssListFilterParam };
