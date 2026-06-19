import { SwIcon } from "../lib/sw-icon.jsx";

const { Box, Stack, Button, Chip, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } = MaterialUI;

const HEADER_CHIP_SX = {
  height: "auto",
  minHeight: 28,
  py: 0.375,
  px: 1.25,
  "& .MuiChip-label": { px: 0.25, py: 0.25 },
};

/** Botón de sesión en AppBar — mismo estilo que isa-patyia LoginButton. */
export function SwaggerHeaderAuth({ enabled, session, onLogin, onJwt, onLogout, ns = "ISA" }) {
  const [menuEl, setMenuEl] = React.useState(null);

  if (!enabled) return null;

  if (session?.token) {
    const label = String(session.username || "JWT").trim().toUpperCase();
    return (
      <Box component="span" className="header-session-wrap" sx={{ display: "inline-flex", alignItems: "center" }}>
        <Tooltip title={session.username ? `Sesión: ${session.username}` : "JWT activo"} arrow>
          <Chip
            size="small"
            variant="filled"
            className="header-session-chip"
            clickable
            icon={<SwIcon icon="mdi:account-circle-outline" size={18} ns={ns} />}
            label={label}
            onClick={(e) => setMenuEl(e.currentTarget)}
            sx={HEADER_CHIP_SX}
          />
        </Tooltip>
        <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
          <MenuItem
            onClick={() => {
              setMenuEl(null);
              onJwt?.();
            }}
          >
            <ListItemIcon>
              <SwIcon icon="mdi:key-outline" size={18} ns={ns} />
            </ListItemIcon>
            <ListItemText>Pegar JWT</ListItemText>
          </MenuItem>
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
