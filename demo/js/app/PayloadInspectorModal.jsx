import { JsonCodeBlock } from "../../../src/components/try-it-out/JsonCodeBlock.jsx";
import { fetchRemoteSwaggerPayloads, inferSwaggerPayloadUrls } from "../../../src/lib/api/swagger-api.js";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";
import {
  useGlassColors,
  glassSurfaceSx,
  glassHeaderSx,
  GlassToolbar,
  GlassTableWrap,
  NEON_COLORS,
} from "../../../src/lib/ui/glass.jsx";

const { useState, useEffect, useCallback, useMemo } = React;
const { useTheme } = MaterialUI;
const {
  Dialog,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} = MaterialUI;

/**
 * JSONs mínimos de BD que necesita el visor IS-Swagger para generarse:
 *
 *   config  → SYS_VALUES.swagger/config          (docs + catalog, sin paths)
 *   meta    → SYS_VALUES.swagger/meta            (info, viewer, tags, servers)
 *   paths   → SYS_VALUES.swagger/paths           (paths + components)
 *   testing → SYS_VALUES.swagger/testing         (opcional; solo si hay suite)
 *
 * No se exponen los artefactos generados (OpenAPI / IS / Postman): el visor
 * se reconstruye desde estos JSONs.
 */
const TAB_DEFS = [
  { id: "config", label: "Config", icon: "mdi:cog-outline", urlKey: "config", file: "swagger-config.json" },
  { id: "meta", label: "Meta", icon: "mdi:tag-multiple-outline", urlKey: "meta", file: "swagger-meta.json" },
  { id: "paths", label: "Paths", icon: "mdi:routes", urlKey: "paths", file: "swagger-paths.json" },
  { id: "testing", label: "Testing", icon: "mdi:flask-outline", urlKey: "testing", file: "testing.json", optional: true },
];

function prettyJson(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}

function resolveTabPayload(tabId, bundle) {
  if (!bundle) return null;
  switch (tabId) {
    case "config": return bundle.config ?? null;
    case "meta": return bundle.meta ?? null;
    case "paths": return bundle.paths ?? null;
    case "testing": return bundle.testing ?? null;
    default: return null;
  }
}

/** Modal full-screen — solo los JSON mínimos de BD (config, meta, paths, testing). */
export function PayloadInspectorModal({ open, onClose, apiBase, connPaths, ns = "ISS" }) {
  const c = useGlassColors();
  const theme = useTheme();
  const palette = theme?.palette ?? {};
  const isDark = palette.mode === "dark" || c.dark;
  const accent = NEON_COLORS.blue;

  const [tab, setTab] = useState("config");
  const [busy, setBusy] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [copied, setCopied] = useState(false);

  const urls = useMemo(() => inferSwaggerPayloadUrls(apiBase, connPaths), [apiBase, connPaths]);

  const visibleTabs = useMemo(() => {
    const hasTesting = bundle?.testing && (Array.isArray(bundle.testing.tests) ? bundle.testing.tests.length > 0 : true);
    return TAB_DEFS.filter((t) => !t.optional || hasTesting || bundle?.errors?.[t.urlKey] === null);
  }, [bundle]);

  const tabDef = visibleTabs.find((t) => t.id === tab) || visibleTabs[0];
  const tabUrl = tabDef?.urlKey ? urls[tabDef.urlKey] : "";
  const tabErr = bundle?.errors?.[tabDef?.urlKey || tabDef?.id] || null;
  const payload = useMemo(() => resolveTabPayload(tab, bundle), [tab, bundle]);
  const text = useMemo(() => prettyJson(payload), [payload]);

  const load = useCallback(async () => {
    if (!apiBase?.trim()) {
      setLoadErr("Sin base API conectada.");
      return;
    }
    setBusy(true);
    setLoadErr("");
    try {
      const data = await fetchRemoteSwaggerPayloads(apiBase, connPaths);
      setBundle(data);
    } catch (e) {
      setLoadErr(e?.message || String(e));
      setBundle(null);
    } finally {
      setBusy(false);
    }
  }, [apiBase, connPaths]);

  useEffect(() => {
    if (!open) return undefined;
    setCopied(false);
    load();
    return undefined;
  }, [open, load]);

  // Si la pestaña activa desaparece (p. ej. testing), saltar a config.
  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!visibleTabs.some((t) => t.id === tab)) setTab(visibleTabs[0].id);
  }, [visibleTabs, tab]);

  async function copyActive() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadActive() {
    if (!text) return;
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = tabDef?.file || "payload.json";
    a.click();
    URL.revokeObjectURL(href);
  }

  // Tokens mode-aware
  const surfaceBg = isDark ? "rgba(8, 18, 32, 0.78)" : "rgba(255, 255, 255, 0.92)";
  const borderCol = isDark ? "rgba(126, 200, 255, 0.18)" : "rgba(30, 144, 255, 0.18)";
  const tabsBg = isDark ? "rgba(13, 33, 55, 0.55)" : "rgba(232, 238, 245, 0.7)";
  const inkPrimary = palette.text?.primary ?? (isDark ? "#e8f4ff" : "#0a2540");
  const inkSecondary = palette.text?.secondary ?? (isDark ? "#9ec5eb" : "#4a6278");
  const codeBg = isDark ? "rgba(2, 10, 22, 0.85)" : "rgba(244, 248, 252, 0.95)";

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      className="isa-sw-demo__inspector"
      slotProps={{
        backdrop: { sx: { backdropFilter: "blur(8px)", backgroundColor: isDark ? "rgba(2, 8, 23, 0.62)" : "rgba(15, 23, 42, 0.32)" } },
      }}
      PaperProps={{
        className: "isa-sw-demo__inspector-paper isa-glass-surface",
        elevation: 0,
        sx: {
          bgcolor: "transparent",
          color: inkPrimary,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          maxHeight: "100dvh",
          overflow: "hidden",
          backgroundImage: surfaceBg,
          borderLeft: `1px solid ${borderCol}`,
          borderRight: `1px solid ${borderCol}`,
          ...glassSurfaceSx(c, { tone: "default", radius: 0, blur: 18, hover: false }),
        },
      }}
    >
      <GlassToolbar
        className="isa-sw-demo__inspector-bar"
        tone="node"
        blur={12}
        radius={0}
        sx={{
          flexShrink: 0,
          width: "100%",
          ...glassHeaderSx(c, accent, {
            px: { xs: 1.5, sm: 2 },
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }),
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <SwIcon icon="mdi:database-eye-outline" size={22} ns={ns} aria-hidden />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }} color="inherit">
              Carga IS-Swagger
            </Typography>
            <Typography variant="caption" color="inherit" noWrap sx={{ display: "block", maxWidth: { xs: 220, sm: 480, md: 720 }, opacity: 0.78 }}>
              {urls.apiBase || "—"}
            </Typography>
          </Box>
        </Box>

        <Box className="isa-sw-demo__inspector-actions" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Volver a descargar desde la API" arrow>
            <span>
              <IconButton size="small" color="inherit" onClick={load} disabled={busy || !apiBase} aria-label="Actualizar JSONs">
                {busy ? <CircularProgress size={18} color="inherit" /> : <SwIcon icon="mdi:refresh" size={20} ns={ns} />}
              </IconButton>
            </span>
          </Tooltip>
          <Button size="small" variant="outlined" color="inherit" disabled={!text || busy} onClick={copyActive} startIcon={<SwIcon icon={copied ? "mdi:check" : "mdi:content-copy"} size={18} ns={ns} />}>
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button size="small" variant="contained" color="primary" disabled={!text || busy} onClick={downloadActive} startIcon={<SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />}>
            Descargar
          </Button>
          <Tooltip title="Cerrar" arrow>
            <IconButton size="small" color="inherit" onClick={onClose} aria-label="Cerrar inspector">
              <SwIcon icon="mdi:close" size={22} ns={ns} />
            </IconButton>
          </Tooltip>
        </Box>
      </GlassToolbar>

      <Box
        className="isa-sw-demo__inspector-tabs"
        sx={{
          flexShrink: 0,
          px: { xs: 0.5, sm: 1 },
          borderBottom: 1,
          borderColor: borderCol,
          backgroundColor: tabsBg,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          TabIndicatorProps={{
            sx: {
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${accent} 0%, #00e5ff 100%)`,
              boxShadow: `0 0 10px ${accent}`,
            },
          }}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: tab === visibleTabs[0]?.id ? 700 : 500,
              minHeight: 44,
              color: inkSecondary,
              "&.Mui-selected": { color: accent, fontWeight: 700 },
            },
          }}
        >
          {visibleTabs.map((t) => (
            <Tab
              key={t.id}
              value={t.id}
              icon={<SwIcon icon={t.icon} size={18} ns={ns} />}
              iconPosition="start"
              label={t.label}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        className="isa-sw-demo__inspector-body"
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: { xs: 1.5, sm: 2 }, py: 1.5, gap: 1, overflow: "hidden" }}
      >
        {loadErr ? (
          <Alert severity="error" sx={{ flexShrink: 0 }} action={<Button color="inherit" size="small" onClick={load}>Reintentar</Button>}>
            {loadErr}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }} className="isa-sw-demo__inspector-meta">
          <Chip size="small" variant="outlined" label="GET · BD" />
          <Chip
            size="small"
            label={`SYS_VALUES.${tabDef?.urlKey === "config" ? "swagger/config" : tabDef?.urlKey === "paths" ? "swagger/paths" : tabDef?.urlKey === "meta" ? "swagger/meta" : "swagger/testing"}`}
            sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
            color="info"
            variant="outlined"
          />
          {tabUrl ? (
            <Chip
              size="small"
              variant="outlined"
              color="info"
              label={tabUrl.replace(urls.apiBase || "", "") || tabUrl}
              sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
            />
          ) : null}
        </Stack>

        {tabErr ? (
          <Alert severity="warning" sx={{ flexShrink: 0 }}>
            {tabErr}
          </Alert>
        ) : null}

        <GlassTableWrap
          className="isa-sw-demo__inspector-cm"
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: codeBg,
            border: `1px solid ${borderCol}`,
          }}
        >
          {busy && !text ? (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
              <CircularProgress size={32} />
            </Box>
          ) : text ? (
            <JsonCodeBlock value={text} fill className="isa-sw-demo__inspector-json" />
          ) : (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: inkSecondary, minHeight: 120 }}>
              <Typography variant="body2">Sin datos para esta pestaña.</Typography>
            </Box>
          )}
        </GlassTableWrap>
      </Box>
    </Dialog>
  );
}