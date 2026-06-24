import { buildGhPagesSwaggerUrl } from "../lib/api/conn-config.js";
import { normalizeApiBase } from "../lib/api/swagger-api.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Box, IconButton, Tooltip } = MaterialUI;

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

/** Abre el visor publicado en GH Pages con la misma API (?conn=). */
export function SwaggerOpenGhPagesBtn({ config, ns = "ISA" }) {
  if (isGhPagesSwaggerHost()) return null;
  const apiBase = apiBaseFromConfig(config);
  const s = typeof location !== "undefined" ? new URLSearchParams(location.search).get("s") : null;
  const href = apiBase ? buildGhPagesSwaggerUrl(apiBase, { s: s || undefined, brand: config?.brand }) : "";
  if (!href) return null;

  return (
    <Box component="span" className="isa-sw-ghpages-btn" sx={{ display: "inline-flex", alignItems: "center" }}>
      <Tooltip title="Abrir visor en GitHub Pages" arrow>
        <IconButton size="small" color="inherit" component="a" href={href} target="_blank" rel="noopener noreferrer" aria-label="Abrir visor en GitHub Pages">
          <SwIcon icon="mdi:open-in-new" size={18} ns={ns} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
