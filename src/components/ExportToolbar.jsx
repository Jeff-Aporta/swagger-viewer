import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { GlassToolbar } from "../lib/ui/glass.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { buildIsDocument, isDocumentText } from "../lib/openapi/is-document.js";
import { ServerUrlField } from "./ServerUrlField.jsx";
import { issFilterDialogProps, issFilterDialogHeader, loginFormActionsSx, loginFormContentSx } from "../lib/ui/glass-filter-dialog.js";

const { useState, useEffect } = React;
const { Typography, Link, Box, IconButton, Tooltip, Dialog, DialogContent, DialogActions, Button, CircularProgress } = MaterialUI;

function prettyJson(text) {
  if (!text?.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

async function fetchExportJson({ url, getDocument }) {
  if (getDocument) return isDocumentText(getDocument());
  if (!url) return "";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

function ExportJsonModal({ open, onClose, title, downloadName, ns, url, getDocument }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setText("");
      try {
        const raw = await fetchExportJson({ url, getDocument });
        if (!cancelled) setText(prettyJson(raw));
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url, getDocument]);

  function download() {
    if (!text) return;
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(href);
  }

  async function copyInModal() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog {...issFilterDialogProps({ open, onClose, maxWidth: "md" })}>
      {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title: `${title} · JSON`, icon: "mdi:code-json" })}
      <DialogContent sx={{ ...loginFormContentSx(), pt: 1, minHeight: loading ? 120 : undefined }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <JsonCodeBlock value={text} maxHeight="70vh" className="isa-sw-export-json" />
        )}
      </DialogContent>
      <DialogActions sx={{ ...loginFormActionsSx(), gap: 1 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button onClick={copyInModal} disabled={!text || loading} startIcon={<SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />}>
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button variant="contained" onClick={download} disabled={!text || loading} startIcon={<SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />}>
          Descargar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Grupo export: etiqueta + ver JSON (modal) + copiar portapapeles. */
function ExportJsonGroup({ label, downloadName, ns, url, getDocument }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      const raw = await fetchExportJson({ url, getDocument });
      if (!raw) return;
      await navigator.clipboard.writeText(prettyJson(raw));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Box className="isa-sw-export-group" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
        <Typography component="span" variant="caption" className="isa-sw-export-label" sx={{ fontWeight: 600, letterSpacing: "0.02em", mr: 0.25, whiteSpace: "nowrap" }}>
          {label}
        </Typography>
        <Tooltip title={`Ver ${label}`} arrow>
          <IconButton size="small" onClick={() => setOpen(true)} aria-label={`Ver ${label}`} className="isa-sw-export-btn isa-sw-export-btn--view">
            <SwIcon icon="mdi:eye-outline" size={18} ns={ns} />
          </IconButton>
        </Tooltip>
        <Tooltip title={copied ? "Copiado" : "Copiar al portapapeles"} arrow>
          <IconButton size="small" onClick={copyToClipboard} aria-label={`Copiar ${label} al portapapeles`} className="isa-sw-export-btn isa-sw-export-btn--copy" color={copied ? "success" : "default"}>
            <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />
          </IconButton>
        </Tooltip>
      </Box>
      <ExportJsonModal open={open} onClose={() => setOpen(false)} title={label} downloadName={downloadName} ns={ns} url={url} getDocument={getDocument} />
    </>
  );
}

/** Fila superior: paneles QA (izq) · export + servidor API (der). */
export function ExportToolbar({ exports: exp, frontLinks = [], ns = "ISA", docked = false, brandIcon, viewerConfig, spec, showServer = false }) {
  const links = Array.isArray(frontLinks) ? frontLinks.filter((l) => l?.url) : [];
  const hasIs = !!(spec && viewerConfig) || !!exp?.isUrl;
  const hasExports = !!(exp?.openApiUrl || exp?.postmanUrl || hasIs);

  if (!links.length && !hasExports && !showServer) return null;

  const inner = (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", minWidth: 0, flex: "1 1 auto" }}>
        {links.map((l) => (
          <Link key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="isa-sw-front-link" underline="hover">
            <SwIcon icon={l.icon || brandIcon || "mdi:link-variant"} size={16} ns={ns} aria-hidden />
            <span>{l.label}</span>
          </Link>
        ))}
      </Box>

      <Box className="isa-sw-toolbar__exports" sx={{ display: "flex", flexWrap: "nowrap", gap: 1, alignItems: "center", ml: "auto", minWidth: 0, flexShrink: 0 }}>
        {exp?.openApiUrl ? (
          <ExportJsonGroup label="OpenAPI" url={exp.openApiUrl} downloadName={exp.openApiDownloadName || "openapi.json"} ns={ns} />
        ) : null}
        {exp?.postmanUrl ? (
          <ExportJsonGroup label="Postman" url={exp.postmanUrl} downloadName={exp.postmanDownloadName || "collection.postman.json"} ns={ns} />
        ) : null}
        {hasIs ? (
          <ExportJsonGroup
            label="IS"
            downloadName={exp?.isDownloadName || "api.is.json"}
            ns={ns}
            url={exp?.isUrl}
            getDocument={spec && viewerConfig ? () => buildIsDocument(viewerConfig, spec) : undefined}
          />
        ) : null}
        {showServer ? <ServerUrlField ns={ns} compact /> : null}
      </Box>
    </>
  );

  return (
    <GlassToolbar className={["isa-sw-toolbar", docked ? "isa-sw-toolbar--docked" : ""].filter(Boolean).join(" ")} sx={docked ? { borderRadius: 0, width: "100%", maxWidth: "none", mb: 0, px: { xs: 1.5, sm: 2 }, py: { xs: 0.75, sm: 1 } } : { mb: 2 }}>
      {docked ? (
        <Box className="isa-sw-toolbar__inner" sx={{ width: "100%", maxWidth: 1160, mx: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          {inner}
        </Box>
      ) : (
        inner
      )}
    </GlassToolbar>
  );
}
