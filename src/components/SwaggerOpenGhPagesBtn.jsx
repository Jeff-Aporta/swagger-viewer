import { buildGhPagesSwaggerUrl, queryFromUrl } from "../lib/api/conn-config.js";
import { normalizeApiBase } from "../lib/api/swagger-api.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { issFilterDialogProps, issFilterDialogHeader, loginFormActionsSx, loginFormContentSx } from "../lib/ui/glass-filter-dialog.js";

const { useState } = React;
const { Box, IconButton, Tooltip, Dialog, DialogContent, DialogActions, Button, TextField, InputAdornment, Stack, Typography } = MaterialUI;

function isGhPagesSwaggerHost() {
  if (typeof location === "undefined") return false;
  return /jeff-aporta\.github\.io$/i.test(location.hostname) && /swagger-viewer/i.test(location.pathname);
}

function apiBaseFromConfig(config) {
  const raw = config?.apiBase || config?.exports?.apiBase;
  if (raw) return normalizeApiBase(raw);
  const url = config?.configUrl || config?.exports?.config;
  if (!url) return "";
  return normalizeApiBase(String(url).replace(/\/swagger\/config\.json$/, ""));
}

function resolveShareUrls(config) {
  if (typeof location === "undefined") return null;
  if (isGhPagesSwaggerHost()) {
    return { full: location.href, query: location.search || "" };
  }
  const apiBase = apiBaseFromConfig(config);
  const s = new URLSearchParams(location.search).get("s");
  const full = apiBase ? buildGhPagesSwaggerUrl(apiBase, { s: s || undefined, brand: config?.brand }) : "";
  if (!full) return null;
  return { full, query: queryFromUrl(full) };
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ShareUrlRow({ label, hint, value, ns, onOpen }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    if (!(await copyText(value))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.25 }}>{label}</Typography>
      {hint ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>{hint}</Typography> : null}
      <TextField
        fullWidth
        size="small"
        value={value}
        slotProps={{
          input: {
            readOnly: true,
            sx: { fontFamily: "ui-monospace, monospace", fontSize: "0.75rem" },
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={0.25}>
                  {onOpen ? (
                    <Tooltip title="Abrir en nueva pestaña" arrow>
                      <IconButton size="small" onClick={onOpen} aria-label="Abrir enlace en nueva pestaña">
                        <SwIcon icon="mdi:open-in-new" size={18} ns={ns} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title={copied ? "Copiado" : "Copiar"} arrow>
                    <IconButton size="small" onClick={handleCopy} disabled={!value} aria-label={`Copiar ${label}`} color={copied ? "success" : "default"}>
                      <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}

/** Compartir enlace al visor (GH Pages o página actual) — URL completa o solo query. */
export function SwaggerOpenGhPagesBtn({ config, ns = "ISA" }) {
  const [open, setOpen] = useState(false);
  const share = resolveShareUrls(config);
  if (!share?.full) return null;

  function openFullUrl() {
    window.open(share.full, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Box component="span" className="isa-sw-share-btn" sx={{ display: "inline-flex", alignItems: "center" }}>
        <Tooltip title="Compartir enlace" arrow>
          <IconButton size="small" color="inherit" onClick={() => setOpen(true)} aria-label="Compartir enlace del visor">
            <SwIcon icon="mdi:share-variant" size={18} ns={ns} />
          </IconButton>
        </Tooltip>
      </Box>
      <Dialog {...issFilterDialogProps({ open, onClose: () => setOpen(false), maxWidth: "md" })}>
        {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title: "Compartir visor", icon: "mdi:share-variant" })}
        <DialogContent sx={{ ...loginFormContentSx(), pt: 1 }}>
          <Stack spacing={2.5}>
            <ShareUrlRow label="URL completa" hint="Enlace listo para abrir el visor con la misma conexión." value={share.full} ns={ns} onOpen={openFullUrl} />
            <ShareUrlRow label="Solo query" hint="Parámetros de la ruta desde ? (incluido), para pegar en otra base del visor." value={share.query} ns={ns} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ ...loginFormActionsSx(), gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
