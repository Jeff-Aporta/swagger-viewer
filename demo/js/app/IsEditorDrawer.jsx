import { IsJsonEditor } from "./IsJsonEditor.jsx";
import { ApiBaseSelect } from "./ApiBaseSelect.jsx";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import { useGlassColors, glassSurfaceSx, glassHeaderSx, GlassToolbar } from "../../../src/lib/ui/glass.jsx";

const { Box, Button, Alert, Typography, Drawer, IconButton, Tooltip } = MaterialUI;

/** Drawer inferior — editor JSON IS (tema ISA / neon-glass). */
export function IsEditorDrawer({ open, onClose, sourceText, onChange, onApply, onFormat, getTextRef, parseErr, ns = "ISA", apiBase, onApiBaseChange, onConnectApi, onPullConfig, onPushConfig, connectBusy }) {
  const c = useGlassColors();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{ disableEnforceFocus: true, disableAutoFocus: true, disableRestoreFocus: true }}
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(2px)" } },
        paper: {
          className: "isa-sw-demo__drawer-paper isa-glass-surface",
          elevation: 0,
          sx: {
            maxHeight: "min(62vh, 640px)",
            borderRadius: "16px 16px 0 0",
            borderBottom: 0,
            bgcolor: "transparent",
            ...glassSurfaceSx(c, { tone: "default", radius: "16px 16px 0 0", blur: 12, hover: false }),
          },
        },
      }}
      aria-labelledby="isa-sw-demo-drawer-title"
    >
      {open ? (
      <Box className="isa-sw-demo__drawer" role="dialog">
        <GlassToolbar
          className="isa-sw-demo__drawer-bar"
          tone="node"
          blur={10}
          radius={0}
          sx={{
            mb: 0,
            flexShrink: 0,
            borderRadius: 0,
            width: "100%",
            ...glassHeaderSx(c, "#1e90ff", { px: 2, py: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 }),
          }}
        >
          <Typography id="isa-sw-demo-drawer-title" variant="subtitle2" className="isa-sw-demo__drawer-title" component="h2" color="inherit" sx={{ fontWeight: 700 }}>
            <SwIcon icon="mdi:file-code-outline" size={18} ns={ns} aria-hidden />
            Constructor IS-Swagger
          </Typography>
          <Box className="isa-sw-demo__drawer-actions">
            <Button size="small" variant="outlined" color="info" disabled={!apiBase?.trim() || connectBusy} onClick={() => onPullConfig?.()} startIcon={<SwIcon icon="mdi:cloud-download-outline" size={18} ns={ns} />}>
              Obtener config
            </Button>
            <Button size="small" variant="outlined" color="warning" disabled={!apiBase?.trim() || connectBusy} onClick={() => onPushConfig?.()} startIcon={<SwIcon icon="mdi:cloud-upload-outline" size={18} ns={ns} />}>
              Publicar PUT
            </Button>
            <Button size="small" variant="contained" color="primary" onClick={onApply} startIcon={<SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} />}>
              Aplicar vista
            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={onFormat}>
              Formatear
            </Button>
            <Tooltip title="Cerrar editor" arrow>
              <IconButton size="small" color="inherit" onClick={onClose} aria-label="Cerrar editor">
                <SwIcon icon="mdi:close" size={20} ns={ns} />
              </IconButton>
            </Tooltip>
          </Box>
        </GlassToolbar>
        <ApiBaseSelect value={apiBase || ""} onChange={onApiBaseChange} onConnect={onConnectApi} busy={connectBusy} ns={ns} />
        <IsJsonEditor value={sourceText} onChange={onChange} onApply={onApply} getTextRef={getTextRef} active={open} ns={ns} />
        {parseErr ? (
          <Alert severity="error" sx={{ mx: 1.5, mb: 1.5, py: 0 }} className="isa-sw-demo__parse-err">
            {parseErr}
          </Alert>
        ) : null}
      </Box>
      ) : null}
    </Drawer>
  );
}
