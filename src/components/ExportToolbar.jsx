import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { GlassToolbar } from "../lib/ui/glass.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { buildIsDocument } from "../lib/openapi/is-document.js";
import { ServerUrlField } from "./ServerUrlField.jsx";
import { issFilterDialogProps, issFilterDialogHeader, loginFormActionsSx, loginFormContentSx } from "../lib/ui/glass-filter-dialog.js";

const { useState, useEffect } = React;
const { Typography, Link, Box, IconButton, Tooltip, Dialog, DialogContent, DialogActions, Button, CircularProgress, TextField, MenuItem } = MaterialUI;

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

/** Select de formato + ver JSON (modal) + copiar portapapeles. */
export function ExportFormatControls({ formats, ns, dense = false }) {
  const [formatId, setFormatId] = useState(formats[0]?.id || "");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const format = formats.find((f) => f.id === formatId) || formats[0];

  useEffect(() => {
    if (!formats.length) return;
    if (!formats.some((f) => f.id === formatId)) setFormatId(formats[0].id);
  }, [formats, formatId]);

  if (!formats.length || !format) return null;

  const iconSize = dense ? 14 : 18;
  const inputH = dense ? 24 : 36;
  const inputFs = dense ? "0.7rem" : "0.8125rem";

  async function copyToClipboard() {
    try {
      const raw = await fetchExportJson({ url: format.url, getDocument: format.getDocument });
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
      <Box className="isa-sw-export-group" sx={{ display: dense ? "flex" : "inline-flex", alignItems: "center", gap: dense ? 0.25 : 0.375, flexShrink: dense ? undefined : 0, width: dense ? "100%" : undefined, minWidth: dense ? 0 : undefined }}>
        {formats.length > 1 ? (
          <TextField
            select
            size="small"
            value={format.id}
            onChange={(e) => setFormatId(e.target.value)}
            className="isa-sw-export-select"
            sx={{ minWidth: dense ? 0 : 88, width: dense ? "100%" : 96, flex: dense ? 1 : undefined, flexShrink: dense ? undefined : 0, "& .MuiInputBase-root": { height: inputH, width: dense ? "100%" : undefined }, "& .MuiSelect-select": { fontSize: inputFs, py: dense ? 0 : undefined, fontWeight: 600, letterSpacing: "0.02em" } }}
            slotProps={{ select: { "aria-label": "Formato export", MenuProps: { PaperProps: { className: "isa-sw-scope-menu" } } } }}
          >
            {formats.map((f) => (
              <MenuItem key={f.id} value={f.id} sx={{ fontSize: inputFs }}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Typography component="span" variant="caption" className="isa-sw-export-label" sx={{ fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap", fontSize: dense ? "0.7rem" : undefined, lineHeight: dense ? 1.15 : undefined }}>
            {format.label}
          </Typography>
        )}
        <Tooltip title={`Ver ${format.label}`} arrow>
          <IconButton size="small" color="inherit" onClick={() => setOpen(true)} aria-label={`Ver ${format.label}`} className="isa-sw-export-btn isa-sw-export-btn--view" sx={dense ? { p: "2px", opacity: 0.92 } : { opacity: 0.92 }}>
            <SwIcon icon="mdi:eye-outline" size={iconSize} ns={ns} />
          </IconButton>
        </Tooltip>
        <Tooltip title={copied ? "Copiado" : "Copiar al portapapeles"} arrow>
          <IconButton size="small" onClick={copyToClipboard} aria-label={`Copiar ${format.label} al portapapeles`} className="isa-sw-export-btn isa-sw-export-btn--copy" color={copied ? "success" : "inherit"} sx={dense ? { p: "2px", opacity: copied ? 1 : 0.92 } : { opacity: copied ? 1 : 0.92 }}>
            <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={iconSize} ns={ns} />
          </IconButton>
        </Tooltip>
      </Box>
      <ExportJsonModal key={format.id} open={open} onClose={() => setOpen(false)} title={format.label} downloadName={format.downloadName} ns={ns} url={format.url} getDocument={format.getDocument} />
    </>
  );
}

export function buildExportFormats(exp, { hasIs, spec, viewerConfig }) {
  const formats = [];
  if (exp?.openApiUrl || exp?.openApiGetDocument) {
    formats.push({ id: "openapi", label: "OpenAPI", url: exp.openApiUrl, getDocument: exp.openApiGetDocument, downloadName: exp.openApiDownloadName || "openapi.json" });
  }
  if (exp?.postmanUrl || exp?.postmanGetDocument) {
    formats.push({ id: "postman", label: "Postman", url: exp.postmanUrl, getDocument: exp.postmanGetDocument, downloadName: exp.postmanDownloadName || "collection.postman.json" });
  }
  if (hasIs) {
    formats.push({
      id: "is",
      label: "IS",
      downloadName: exp?.isDownloadName || "api.is.json",
      getDocument: exp?.isGetDocument || (spec && viewerConfig ? () => buildIsDocument(viewerConfig, spec) : undefined),
    });
  }
  return formats;
}

/** Enlaces al front QA u otras apps relacionadas. */
export function SwaggerFrontLinks({ frontLinks = [], brandIcon, ns = "ISA", dense = false }) {
  const links = Array.isArray(frontLinks) ? frontLinks.filter((l) => l?.label) : [];
  if (!links.length) return null;
  const linkIconSize = dense ? 14 : 16;
  const denseSx = dense ? { fontSize: "0.75rem", lineHeight: 1.2, gap: 0.75, display: "inline-flex", alignItems: "center" } : { display: "inline-flex", alignItems: "center", gap: 0.75 };
  return (
    <Box className="isa-sw-front-links" sx={{ display: "inline-flex", alignItems: "center", gap: dense ? 1.25 : 1.5, minWidth: 0, flexShrink: 0 }}>
      {links.map((l, i) => {
        const content = (
          <>
            <SwIcon icon={l.icon || brandIcon || "mdi:link-variant"} size={linkIconSize} ns={ns} aria-hidden />
            <span>{l.label}</span>
          </>
        );
        const key = l.url || `${l.label}-${i}`;
        return l.url ? (
          <Link key={key} href={l.url} target="_blank" rel="noopener noreferrer" className="isa-sw-front-link" underline="hover" sx={denseSx}>
            {content}
          </Link>
        ) : (
          <Box key={key} component="span" className="isa-sw-front-link isa-sw-front-link--static" sx={denseSx}>
            {content}
          </Box>
        );
      })}
    </Box>
  );
}

/** Barra embed sin shell: solo enlaces + servidor (export va en menú de sesión). */
export function ExportToolbar({ frontLinks = [], ns = "ISA", docked = false, brandIcon, showServer = false, toolbarEnd = null }) {
  if (!frontLinks?.length && !showServer && !toolbarEnd) return null;

  const inner = (
    <>
      <SwaggerFrontLinks frontLinks={frontLinks} brandIcon={brandIcon} ns={ns} />
      <Box className="isa-sw-toolbar__tools" sx={{ display: "inline-flex", flexWrap: "nowrap", gap: 1, alignItems: "center", ml: "auto", minWidth: 0, flexShrink: 0 }}>
        {showServer ? <ServerUrlField ns={ns} compact dense /> : null}
        {toolbarEnd}
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
