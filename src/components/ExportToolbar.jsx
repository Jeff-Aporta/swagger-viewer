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
  if (getDocument) {
    const doc = getDocument();
    if (doc == null) return "";
    return typeof doc === "string" ? doc : JSON.stringify(doc);
  }
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
function ExportJsonGroup({ label, downloadName, ns, url, getDocument, dense = false }) {
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

  const iconSize = dense ? 14 : 18;

  return (
    <>
      <Box className="isa-sw-export-group" sx={{ display: "inline-flex", alignItems: "center", gap: dense ? 0 : 0.25 }}>
        <Typography component="span" variant="caption" className="isa-sw-export-label" sx={{ fontWeight: 600, letterSpacing: "0.02em", mr: dense ? 0.125 : 0.25, whiteSpace: "nowrap", fontSize: dense ? "0.7rem" : undefined, lineHeight: dense ? 1.15 : undefined }}>
          {label}
        </Typography>
        <Tooltip title={`Ver ${label}`} arrow>
          <IconButton size="small" onClick={() => setOpen(true)} aria-label={`Ver ${label}`} className="isa-sw-export-btn isa-sw-export-btn--view" sx={dense ? { p: "2px" } : undefined}>
            <SwIcon icon="mdi:eye-outline" size={iconSize} ns={ns} />
          </IconButton>
        </Tooltip>
        <Tooltip title={copied ? "Copiado" : "Copiar al portapapeles"} arrow>
          <IconButton size="small" onClick={copyToClipboard} aria-label={`Copiar ${label} al portapapeles`} className="isa-sw-export-btn isa-sw-export-btn--copy" color={copied ? "success" : "default"} sx={dense ? { p: "2px" } : undefined}>
            <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={iconSize} ns={ns} />
          </IconButton>
        </Tooltip>
      </Box>
      <ExportJsonModal open={open} onClose={() => setOpen(false)} title={label} downloadName={downloadName} ns={ns} url={url} getDocument={getDocument} />
    </>
  );
}

/** Fila superior: paneles QA (izq) · export + servidor API (der). */
export function ExportToolbar({ exports: exp, frontLinks = [], ns = "ISA", docked = false, header = false, brandIcon, viewerConfig, spec, showServer = false }) {
  const links = Array.isArray(frontLinks) ? frontLinks.filter((l) => l?.url) : [];
  const hasIs = !!(exp?.isGetDocument || (spec && viewerConfig));
  const hasExports = !!(exp?.openApiGetDocument || exp?.postmanGetDocument || exp?.isGetDocument || exp?.openApiUrl || exp?.postmanUrl || hasIs);

  if (!links.length && !hasExports && !showServer) return null;

  const dense = header;
  const linkIconSize = dense ? 13 : 16;

  const inner = (
    <>
      <Box sx={{ display: "flex", flexWrap: "nowrap", gap: dense ? 0.75 : 1, alignItems: "center", minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
        {links.map((l) => (
          <Link key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="isa-sw-front-link" underline="hover" sx={dense ? { fontSize: "0.7rem", lineHeight: 1.15, gap: 0.375, display: "inline-flex", alignItems: "center" } : undefined}>
            <SwIcon icon={l.icon || brandIcon || "mdi:link-variant"} size={linkIconSize} ns={ns} aria-hidden />
            <span>{l.label}</span>
          </Link>
        ))}
      </Box>

      <Box className="isa-sw-toolbar__exports" sx={{ display: "flex", flexWrap: "nowrap", gap: dense ? 0.5 : 1, alignItems: "center", ml: "auto", minWidth: 0, flexShrink: 0 }}>
        {exp?.openApiUrl || exp?.openApiGetDocument ? (
          <ExportJsonGroup label="OpenAPI" url={exp.openApiUrl} getDocument={exp.openApiGetDocument} downloadName={exp.openApiDownloadName || "openapi.json"} ns={ns} dense={dense} />
        ) : null}
        {exp?.postmanUrl || exp?.postmanGetDocument ? (
          <ExportJsonGroup label="Postman" url={exp.postmanUrl} getDocument={exp.postmanGetDocument} downloadName={exp.postmanDownloadName || "collection.postman.json"} ns={ns} dense={dense} />
        ) : null}
        {hasIs ? (
          <ExportJsonGroup
            label="IS"
            downloadName={exp?.isDownloadName || "api.is.json"}
            ns={ns}
            dense={dense}
            getDocument={exp?.isGetDocument || (spec && viewerConfig ? () => buildIsDocument(viewerConfig, spec) : undefined)}
          />
        ) : null}
        {showServer ? <ServerUrlField ns={ns} compact={!dense} dense={dense} /> : null}
      </Box>
    </>
  );

  if (header) {
    return (
      <Box className="isa-sw-toolbar isa-sw-toolbar--header" sx={{ width: "100%", display: "flex", alignItems: "center", gap: 0.75, minHeight: 26, maxHeight: 30, overflow: "hidden" }}>
        {inner}
      </Box>
    );
  }

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
