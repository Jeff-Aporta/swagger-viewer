/** Diálogo filtro ISS — misma superficie neon glass que login (login-surface). */

import {
  GLASS_CARD_CLASS,
  LoginHeaderBand,
  loginCardSx,
  loginDialogProps,
} from "../../../../front-shared/cdn/isa/js/ui/kits/neon-glass/login/login-surface.js";
import { loginFormActionsSx, loginFormContentSx } from "../../../../front-shared/cdn/isa/js/ui/kits/neon-glass/login/login-form-fields.js";

export const ISS_FILTER_DIALOG_ACCENT = "#1e90ff";

export function issFilterDialogProps({ open, onClose, maxWidth = "sm" } = {}) {
  return loginDialogProps({
    open,
    onClose,
    maxWidth,
    fullWidth: true,
    className: "isa-sw-iss-filter-dialog isa-login-dialog",
    PaperProps: {
      elevation: 0,
      className: `isa-login-card ${GLASS_CARD_CLASS} isa-sw-iss-filter-card`,
      sx: loginCardSx({ maxWidth: maxWidth === "sm" ? 600 : 440, m: 1 }),
    },
  });
}

export function issFilterDialogHeader(React, MUI, UI, { title, icon = "mdi:filter-cog-outline", accent = ISS_FILTER_DIALOG_ACCENT }) {
  return LoginHeaderBand(React, MUI, UI, { icon, title, accent });
}

export { loginFormContentSx, loginFormActionsSx, GLASS_CARD_CLASS };
