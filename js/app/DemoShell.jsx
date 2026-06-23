import { readBrandFromMeta } from "../../../src/lib/brand/viewer-brand.js";
import { GlassPageSurface } from "../../../src/lib/ui/glass.jsx";

const { Box, Typography } = MaterialUI;

const INICIO_TAB = [{ id: "inicio", label: "Inicio", icon: "mdi:home-outline" }];

/** AppShell front-shared + superficie neon-glass para el demo IS-Swagger. */
export function DemoShell({ children, ns = "ISS", toolbarEnd = null }) {
  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const meta = readBrandFromMeta();
  const title = meta.title || "IS-Swagger";
  const icon = meta.icon || "mdi:file-code-outline";

  if (!Shell) {
    return (
      <Box className="isa-sw-demo isa-sw-demo--noshell" sx={{ minHeight: "100vh", p: 2 }}>
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          AppShell no cargó — revisar loader.mjs y front-shared.
        </Typography>
        {children}
      </Box>
    );
  }

  return (
    <Shell
      ns={ns}
      title={title}
      icon={icon}
      showTarget={false}
      bodyScroll
      navRows={[{ id: "demo", value: "inicio", onChange: () => {}, tabs: INICIO_TAB }]}
      toolbarEnd={toolbarEnd}
    >
      <GlassPageSurface orbs className="isa-sw-demo__page" sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>
        {children}
      </GlassPageSurface>
    </Shell>
  );
}
