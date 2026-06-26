import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { jsonTextToFilterQuery } from "../lib/filter/iss-list-filter.js";
import { issFilterDialogProps, issFilterDialogHeader, loginFormActionsSx, loginFormContentSx } from "../lib/ui/glass-filter-dialog.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Dialog, DialogContent, DialogActions, Button, Alert, Typography } = MaterialUI;

export function IssFilterJsonDialog({ open, onClose, jsonText, onJsonChange, onApply, error, disabled, title = "Filtro JSON", ns = "ISA" }) {
  return (
    <Dialog {...issFilterDialogProps({ open, onClose, maxWidth: "md" })}>
      {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title, icon: "mdi:code-json" })}
      <DialogContent sx={{ ...loginFormContentSx(), pt: 1, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 280 }}>
        <Typography variant="caption" color="text.secondary">
          Edite el objeto del filtro; al aplicar se actualiza el parámetro B64 en la petición.
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <JsonCodeBlock value={jsonText} onChange={onJsonChange} readOnly={false} disabled={disabled} minHeight="min(50vh, 360px)" maxHeight="min(62vh, 480px)" className="isa-sw-iss-filter-json-cm" placeholder="{}" />
      </DialogContent>
      <DialogActions sx={{ ...loginFormActionsSx(), gap: 1 }}>
        <Button onClick={onClose} disabled={disabled}>Cancelar</Button>
        <Button variant="contained" disabled={disabled} onClick={onApply} startIcon={<SwIcon icon="mdi:check" size={18} ns={ns} style={{ color: "inherit" }} />}>
          Aplicar JSON
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function filterValueToEditableJson(raw) {
  if (raw == null || !String(raw).trim()) return "";
  const s = String(raw).trim();
  try {
    const json = s.startsWith("{") ? s : decodeURIComponent(escape(atob(s)));
    const obj = JSON.parse(json);
    return JSON.stringify(obj, null, 2);
  } catch {
    return "";
  }
}

export function applyEditableJsonToFilter(jsonText, ext) {
  const compact = String(jsonText ?? "").trim();
  if (!compact) return { ok: true, value: "" };
  try {
    const normalized = JSON.stringify(JSON.parse(compact));
    return jsonTextToFilterQuery(normalized, ext);
  } catch {
    return { ok: false, error: "JSON inválido." };
  }
}
