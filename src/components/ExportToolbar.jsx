import { SwIcon } from "../lib/sw-icon.jsx";
import { GlassToolbar } from "../lib/glass.jsx";
import { buildIsDocument, isDocumentText } from "../lib/is-document.js";
import { ServerUrlField } from "./ServerUrlField.jsx";

const { useState } = React;
const { Typography, Link, Box, IconButton, Tooltip } = MaterialUI;

/** Grupo export: etiqueta + descargar + copiar portapapeles (URL remota). */
function ExportActionGroup({ label, url, downloadName, ns }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    if (!url) return;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Box className="isa-sw-export-group" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
      <Typography
        component="span"
        variant="caption"
        className="isa-sw-export-label"
        sx={{ fontWeight: 600, letterSpacing: "0.02em", mr: 0.25, whiteSpace: "nowrap" }}
      >
        {label}
      </Typography>
      <Tooltip title={`Descargar ${downloadName}`} arrow>
        <IconButton
          component={Link}
          href={url}
          download={downloadName}
          size="small"
          aria-label={`Descargar ${label}`}
          className="isa-sw-export-btn isa-sw-export-btn--download"
        >
          <SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />
        </IconButton>
      </Tooltip>
      <Tooltip title={copied ? "Copiado" : "Copiar al portapapeles"} arrow>
        <IconButton
          size="small"
          onClick={copyToClipboard}
          aria-label={`Copiar ${label} al portapapeles`}
          className="isa-sw-export-btn isa-sw-export-btn--copy"
          color={copied ? "success" : "default"}
        >
          <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/** Grupo export IS — documento inyectable generado en cliente o vía URL. */
function ExportIsGroup({ label, downloadName, ns, url, getDocument }) {
  const [copied, setCopied] = useState(false);

  async function resolveText() {
    if (getDocument) return isDocumentText(getDocument());
    if (!url) return "";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    return res.text();
  }

  async function copyToClipboard() {
    try {
      const text = await resolveText();
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function download() {
    try {
      const text = await resolveText();
      if (!text) return;
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      /* ignore */
    }
  }

  return (
    <Box className="isa-sw-export-group" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
      <Typography
        component="span"
        variant="caption"
        className="isa-sw-export-label"
        sx={{ fontWeight: 600, letterSpacing: "0.02em", mr: 0.25, whiteSpace: "nowrap" }}
      >
        {label}
      </Typography>
      <Tooltip title={`Descargar ${downloadName}`} arrow>
        <IconButton
          size="small"
          onClick={download}
          aria-label={`Descargar ${label}`}
          className="isa-sw-export-btn isa-sw-export-btn--download"
        >
          <SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />
        </IconButton>
      </Tooltip>
      <Tooltip title={copied ? "Copiado" : "Copiar al portapapeles"} arrow>
        <IconButton
          size="small"
          onClick={copyToClipboard}
          aria-label={`Copiar ${label} al portapapeles`}
          className="isa-sw-export-btn isa-sw-export-btn--copy"
          color={copied ? "success" : "default"}
        >
          <SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />
        </IconButton>
      </Tooltip>
    </Box>
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
          <Link
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="isa-sw-front-link"
            underline="hover"
          >
            <SwIcon icon={l.icon || brandIcon || "mdi:link-variant"} size={16} ns={ns} aria-hidden />
            <span>{l.label}</span>
          </Link>
        ))}
      </Box>

      <Box
        className="isa-sw-toolbar__exports"
        sx={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 1,
          alignItems: "center",
          ml: "auto",
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        {exp?.openApiUrl ? (
          <ExportActionGroup
            label="OpenAPI"
            url={exp.openApiUrl}
            downloadName={exp.openApiDownloadName || "openapi.json"}
            ns={ns}
          />
        ) : null}
        {exp?.postmanUrl ? (
          <ExportActionGroup
            label="Postman"
            url={exp.postmanUrl}
            downloadName={exp.postmanDownloadName || "collection.postman.json"}
            ns={ns}
          />
        ) : null}
        {hasIs ? (
          <ExportIsGroup
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
    <GlassToolbar
      className={["isa-sw-toolbar", docked ? "isa-sw-toolbar--docked" : ""].filter(Boolean).join(" ")}
      sx={
        docked
          ? {
              borderRadius: 0,
              width: "100%",
              maxWidth: "none",
              mb: 0,
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
            }
          : { mb: 2 }
      }
    >
      {docked ? (
        <Box
          className="isa-sw-toolbar__inner"
          sx={{
            width: "100%",
            maxWidth: 1160,
            mx: "auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
          {inner}
        </Box>
      ) : (
        inner
      )}
    </GlassToolbar>
  );
}
