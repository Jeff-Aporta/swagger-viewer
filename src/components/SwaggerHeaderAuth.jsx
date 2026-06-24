import { formatSessionDisplayName, stripContapymeEmail, resolveSessionHeaderLabel } from "../lib/auth/auth.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { ExportFormatControls } from "./ExportToolbar.jsx";

const { Box, Stack, Button, Chip, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } = MaterialUI;

const HEADER_CHIP_SX = {
  height: "auto",
  minHeight: 28,
  py: 0.375,
  px: 1.25,
  "& .MuiChip-label": { px: 0.25, py: 0.25 },
};

/** Botón de sesión en AppBar — export OpenAPI/Postman solo con JWT activo. */
export function SwaggerHeaderAuth({ enabled, session, onLogin, onLogout, ns = "ISA", exportFormats = [] }) {
  const [menuEl, setMenuEl] = React.useState(null);
  const hasExports = Array.isArray(exportFormats) && exportFormats.length > 0;

  if (!enabled) return null;

  if (session?.token) {
    const who = session.displayName || session.username || "";
    const label = resolveSessionHeaderLabel(session.displayName, who, "JWT");
    const tooltipWho = formatSessionDisplayName(who) || stripContapymeEmail(who);
    return (
      <Box component="span" className="header-session-wrap" sx={{ display: "inline-flex", alignItems: "center" }}>
        <Tooltip title={tooltipWho ? `Sesión: ${tooltipWho}` : "JWT activo"} arrow>
          <Chip
            size="small"
            variant="filled"
            className="isa-sw-chip header-session-chip"
            clickable
            icon={<SwIcon icon="mdi:account-circle-outline" size={18} ns={ns} />}
            label={label}
            onClick={(e) => setMenuEl(e.currentTarget)}
            sx={HEADER_CHIP_SX}
          />
        </Tooltip>
        <Menu
          anchorEl={menuEl}
          open={Boolean(menuEl)}
          onClose={() => setMenuEl(null)}
          slotProps={{ paper: { className: "isa-sw-session-menu", sx: { minWidth: hasExports ? 220 : undefined } } }}
        >
          {hasExports ? (
            <>
              <Box className="isa-sw-session-menu__exports" sx={{ px: 1.25, py: 0.75 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <ExportFormatControls formats={exportFormats} ns={ns} dense />
              </Box>
              <Divider />
            </>
          ) : null}
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              onLogout?.();
            }}
          >
            <ListItemIcon>
              <SwIcon icon="mdi:logout" size={18} ns={ns} />
            </ListItemIcon>
            <ListItemText>Cerrar sesión</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Box component="span" className="header-session-wrap" sx={{ display: "inline-flex", alignItems: "center" }}>
      <Stack direction="row" spacing={0.75} alignItems="center" className="header-session-btn">
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<SwIcon icon="mdi:login" size={18} ns={ns} />}
          onClick={() => onLogin?.()}
          aria-label="Iniciar sesión"
        >
          Iniciar sesión
        </Button>
      </Stack>
    </Box>
  );
}
