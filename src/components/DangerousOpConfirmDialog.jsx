import { issFilterDialogProps, issFilterDialogHeader, loginFormActionsSx, loginFormContentSx } from "../lib/ui/glass-filter-dialog.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Dialog, DialogContent, DialogActions, Button, Typography, Alert } = MaterialUI;

export function DangerousOpConfirmDialog({ open, onClose, onConfirm, copy, busy, ns = "ISA" }) {
  if (!copy) return null;
  return (
    <Dialog {...issFilterDialogProps({ open, onClose, maxWidth: "sm" })}>
      {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title: copy.title, icon: copy.icon, accent: copy.accent })}
      <DialogContent sx={{ ...loginFormContentSx(), pt: 1 }}>
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {copy.alert || "Acción con impacto — confirme antes de continuar."}
        </Alert>
        {copy.lines.map((line, i) => (
          <Typography key={i} variant="body2" sx={{ mb: i < copy.lines.length - 1 ? 1 : 0 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>") }} />
        ))}
      </DialogContent>
      <DialogActions sx={{ ...loginFormActionsSx(), gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button variant="contained" color={copy.buttonColor || "warning"} onClick={onConfirm} disabled={busy} startIcon={<SwIcon icon="mdi:alert-decagram-outline" size={18} ns={ns} style={{ color: "inherit" }} />}>
          {copy.acceptLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
