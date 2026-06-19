import {
  readCredentials,
  saveCredentials,
  fetchTestJwt,
  storeJwt,
  clearJwt,
  normalizeJwt,
  formatLocalDateTime,
} from "../lib/auth.js";
import { SwIcon } from "../lib/sw-icon.jsx";

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
} = MaterialUI;

export function AuthDialogs({ authBase, enabled, onSessionChange, ns = "ISA" }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [jwtOpen, setJwtOpen] = useState(false);
  const [loginHint, setLoginHint] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [remember, setRemember] = useState(true);
  const [jwt, setJwt] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [jwtErr, setJwtErr] = useState("");
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
    setLoginHint(hint || "");
    setLoginOpen(true);
  }, [loadForm]);

  const openJwt = useCallback(() => {
    setJwt("");
    setJwtErr("");
    setJwtOpen(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    globalThis.__isaSwaggerAuth = {
      openLogin,
      openJwt,
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
  }, [enabled, openLogin, openJwt, onSessionChange]);

  if (!enabled) return null;

  async function submitLogin() {
    if (!user.trim() || !pass) {
      setLoginErr("Usuario y contraseña requeridos.");
      return;
    }
    setBusy(true);
    setLoginErr("");
    try {
      saveCredentials(user.trim(), pass, remember);
      const data = await fetchTestJwt(authBase, user.trim(), pass);
      storeJwt(data.token, { expiresAt: data.expiresAt, username: data.username });
      setPass("");
      setLoginOpen(false);
      setLoginHint("");
      onSessionChange?.({
        token: data.token,
        username: data.username,
        expiresAt: data.expiresAt,
        message: `Autorizado como ${data.username} · expira ${formatLocalDateTime(data.expiresAt)}`,
      });
    } catch (e) {
      setLoginErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function submitJwt() {
    const token = normalizeJwt(jwt);
    if (!token) {
      setJwtErr("Pega un JWT válido.");
      return;
    }
    storeJwt(token);
    setJwtOpen(false);
    onSessionChange?.({ token, message: "JWT aplicado manualmente." });
  }

  return (
    <>
      <Dialog open={loginOpen} onClose={busy ? undefined : () => setLoginOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SwIcon icon="mdi:login" size={22} ns={ns} />
          Iniciar sesión
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {loginHint ? <Alert severity="warning">{loginHint}</Alert> : null}
            {loginErr ? <Alert severity="error">{loginErr}</Alert> : null}
            <TextField
              label="Usuario"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              fullWidth
              autoFocus
              size="small"
              autoComplete="username"
            />
            <TextField
              label="Contraseña"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              fullWidth
              size="small"
              autoComplete="current-password"
              onKeyDown={(e) => e.key === "Enter" && !busy && submitLogin()}
            />
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(!!e.target.checked)} />}
              label="Recordar usuario y contraseña"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLoginOpen(false)} disabled={busy} startIcon={<SwIcon icon="mdi:close" size={18} ns={ns} />}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={busy || !user.trim() || !pass}
            onClick={submitLogin}
            startIcon={<SwIcon icon="mdi:key-variant" size={18} ns={ns} />}
          >
            {busy ? "Solicitando JWT…" : "Obtener JWT"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={jwtOpen} onClose={() => setJwtOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SwIcon icon="mdi:key-outline" size={22} ns={ns} />
          Pegar JWT
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {jwtErr ? <Alert severity="error">{jwtErr}</Alert> : null}
            <TextField
              label="Token"
              value={jwt}
              onChange={(e) => setJwt(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              placeholder="eyJhbG…"
              size="small"
              inputProps={{ style: { fontFamily: "ui-monospace, monospace", fontSize: 13 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setJwtOpen(false)} startIcon={<SwIcon icon="mdi:close" size={18} ns={ns} />}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!jwt.trim()}
            onClick={submitJwt}
            startIcon={<SwIcon icon="mdi:check" size={18} ns={ns} />}
          >
            Aplicar JWT
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
