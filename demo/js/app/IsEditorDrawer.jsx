import { IsJsonEditor } from "./IsJsonEditor.jsx";
import { SwIcon } from "../../../src/lib/sw-icon.jsx";
import { useGlassColors, glassSurfaceSx, glassHeaderSx } from "../../../src/lib/glass.jsx";

const { Box, Button, Alert, Typography, Drawer, IconButton, Tooltip } = MaterialUI;

/** Drawer inferior — editor JSON IS (tema ISA / neon-glass). */
export function IsEditorDrawer({ open, onClose, sourceText, onChange, onApply, onFormat, getTextRef, parseErr, ns = "ISA" }) {
  const c = useGlassColors();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      keepMounted
      ModalProps={{ disableEnforceFocus: true, disableAutoFocus: true }}
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(2px)" } },
        paper: {
          className: "isa-sw-demo__drawer-paper",
          elevation: 0,
          sx: {
            maxHeight: "min(62vh, 640px)",
            borderRadius: "16px 16px 0 0",
            borderBottom: 0,
            color: c.text,
            ...glassSurfaceSx(c, { tone: "default", radius: "16px 16px 0 0", blur: 12, hover: false }),
          },
        },
      }}
      aria-labelledby="isa-sw-demo-drawer-title"
    >
      <Box className="isa-sw-demo__drawer" role="dialog">
        <Box className="isa-sw-demo__drawer-bar" sx={glassHeaderSx(c, "#1e90ff", { px: 2, py: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1 })}>
          <Typography id="isa-sw-demo-drawer-title" variant="subtitle2" className="isa-sw-demo__drawer-title" component="h2" sx={{ color: c.text, fontWeight: 700 }}>
            <SwIcon icon="mdi:file-code-outline" size={18} ns={ns} aria-hidden />
            Constructor IS-Swagger
          </Typography>
          <Box className="isa-sw-demo__drawer-actions">
            <Button size="small" variant="contained" onClick={onApply} startIcon={<SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} />}>
              Aplicar vista
            </Button>
            <Button size="small" variant="outlined" onClick={onFormat}>
              Formatear
            </Button>
            <Tooltip title="Cerrar editor" arrow>
              <IconButton size="small" onClick={onClose} aria-label="Cerrar editor" sx={{ color: c.muted }}>
                <SwIcon icon="mdi:close" size={20} ns={ns} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <IsJsonEditor value={sourceText} onChange={onChange} onApply={onApply} getTextRef={getTextRef} active={open} ns={ns} />
        {parseErr ? (
          <Alert severity="error" sx={{ mx: 1.5, mb: 1.5, py: 0 }} className="isa-sw-demo__parse-err">
            {parseErr}
          </Alert>
        ) : null}
      </Box>
    </Drawer>
  );
}
