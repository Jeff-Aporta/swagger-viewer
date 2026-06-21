import {
  readCredentials,
  saveCredentials,
  fetchTestJwt,
  storeJwt,
  clearJwt,
  formatLocalDateTime,
  stripContapymeEmail,
  normalizeContapymeLoginId,
} from "../lib/auth.js";
import { SwIcon } from "../lib/sw-icon.jsx";
import { HttpErrorAlert } from "./HttpErrorAlert.jsx";
import {
  LoginHeaderBand,
  loginDialogProps,
  contapymeLoginTextFieldProps,
  LOGIN_REMEMBER_LABEL,
} from "../../../front-shared/cdn/isa/js/ui/login-surface.js";

const { useState, useEffect, useCallback } = React;
const {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Tooltip,
} = MaterialUI;

function swaggerUiIcon(ns) {
  return function SwaggerUiIcon(props) {
    return <SwIcon {...props} ns={ns} />;
  };
}

export function AuthDialogs({ authBase, authKind, loginPath, enabled, onSessionChange, ns = "ISA" }) {
  const isPortal = authKind === "portal" || String(loginPath || "").includes("portal-login");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginHint, setLoginHint] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginErr, setLoginErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadForm = useCallback(() => {
    const c = readCredentials();
    setUser(c.username || "");
    setPass(c.password || "");
    setRemember(c.remember !== false);
  }, []);

  const openLogin = useCallback((hint) => {
    loadForm();
    setLoginErr("");
    setShowPass(false);
    setLoginHint(hint || "");
    setLoginOpen(true);
  }, [loadForm]);

  useEffect(() => {
    if (!enabled) return;
    globalThis.__isaSwaggerAuth = {
      openLogin,
      clear: () => {
        clearJwt();
        onSessionChange?.(null);
      },
    };
    globalThis.__isaSwaggerJwt = () => {
      try {
        const raw = sessionStorage.getItem("jeffaporta:swagger-test-jwt");
        if (!raw) return "";
        return JSON.parse(raw).token || "";
      } catch {
        return "";
      }
    };
    return () => {
      try {
        delete globalThis.__isaSwaggerAuth;
        delete globalThis.__isaSwaggerJwt;
      } catch {
        /* ignore */
      }
    };
  }, [enabled, openLogin, onSessionChange]);

  if (!enabled) return null;

  async function submitLogin() {
    if (!user.trim() || !pass) {
      setLoginErr("Usuario y contraseña requeridos");
      return;
    }
    const loginId = isPortal ? normalizeContapymeLoginId(user) : user.trim();
    setBusy(true);
    setLoginErr("");
    try {
      saveCredentials(user.trim(), pass, remember);
      const data = await fetchTestJwt(authBase, loginId, pass, {
        loginKind: isPortal ? "portal" : authKind || "system-login",
        loginPath,
      });
      storeJwt(data.token, {
        expiresAt: data.expiresAt,
        username: data.username || loginId,
        displayName: data.displayName || data.username || loginId,
        claims: data.claims || null,
      });
      setPass("");
      setLoginOpen(false);
      setLoginHint("");
      const who = data.displayName || stripContapymeEmail(data.username || loginId) || loginId;
      onSessionChange?.({
        token: data.token,
        username: data.username || loginId,
        expiresAt: data.expiresAt,
        message: `Autorizado como ${who}${data.expiresAt ? ` · expira ${formatLocalDateTime(data.expiresAt)}` : ""}`,
      });
    } catch (e) {
      setLoginErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const loginUi = { Icon: swaggerUiIcon(ns) };

  return (
    <Dialog
        {...loginDialogProps({
          open: loginOpen,
          onClose: busy ? undefined : () => { setLoginOpen(false); setShowPass(false); },
        })}
      >
        {LoginHeaderBand(React, MaterialUI, loginUi, {
          icon: "mdi:account-key-outline",
          title: "Iniciar sesión",
          accent: "#1e90ff",
        })}
        <DialogContent sx={{ pt: 2 }}>
          {loginHint ? <Alert severity="warning" sx={{ mb: 2 }}>{loginHint}</Alert> : null}
          {loginErr ? <HttpErrorAlert message={loginErr} sx={{ mb: 2 }} /> : null}
          <Stack spacing={2}>
            <TextField
              {...contapymeLoginTextFieldProps({
                value: user,
                onChange: (e) => setUser(e.target.value),
                fullWidth: true,
                autoFocus: true,
                size: "small",
                onKeyDown: (e) => { if (e.key === "Enter") submitLogin(); },
              })}
            />
            <TextField
              label="Contraseña"
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              fullWidth
              size="small"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && !busy && submitLogin()}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showPass ? "Ocultar contraseña" : "Mostrar contraseña"} arrow>
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                          onClick={() => setShowPass((v) => !v)}
                          tabIndex={-1}
                        >
                          <SwIcon icon={showPass ? "mdi:eye-off-outline" : "mdi:eye-outline"} size={20} ns={ns} />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(!!e.target.checked)} size="small" />}
              label={LOGIN_REMEMBER_LABEL}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" disabled={busy || !user.trim()} onClick={submitLogin}>
            {busy ? "Entrando…" : (isPortal ? "Entrar" : "Obtener JWT")}
          </Button>
        </DialogActions>
      </Dialog>
  );
}
