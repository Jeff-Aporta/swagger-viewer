import { SwIcon } from "../lib/sw-icon.jsx";
import { GlassToolbar } from "../lib/glass.jsx";

const { Button, Typography, Link, Box } = MaterialUI;

/** Fila superior: paneles QA (izq, solid) · export OpenAPI/Postman (der). */
export function ExportToolbar({ exports: exp, frontLinks = [], status, ns = "ISA", docked = false }) {
  const links = Array.isArray(frontLinks) ? frontLinks.filter((l) => l?.url) : [];
  const hasExports = !!(exp?.openApiUrl || exp?.postmanUrl);

  if (!links.length && !hasExports && !status?.message) return null;

  const inner = (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", minWidth: 0 }}>
        {links.map((l) => (
          <Button
            key={l.url}
            component={Link}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="contained"
            startIcon={<SwIcon icon="mdi:flask-outline" size={18} ns={ns} />}
          >
            {l.label}
          </Button>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          ml: "auto",
          minWidth: 0,
        }}
      >
        {exp?.openApiUrl ? (
          <Button
            component={Link}
            href={exp.openApiUrl}
            download={exp.openApiDownloadName || "openapi.json"}
            size="small"
            variant="outlined"
            startIcon={<SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />}
          >
            OpenAPI
          </Button>
        ) : null}
        {exp?.postmanUrl ? (
          <Button
            component={Link}
            href={exp.postmanUrl}
            download={exp.postmanDownloadName || "collection.postman.json"}
            size="small"
            variant="outlined"
            startIcon={<SwIcon icon="mdi:tray-arrow-down" size={18} ns={ns} />}
          >
            Postman
          </Button>
        ) : null}
        {status?.message ? (
          <Typography
            variant="caption"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: status.tone === "err" ? "error.main" : status.tone === "ok" ? "success.main" : "text.secondary",
            }}
          >
            {status.tone === "ok" ? (
              <SwIcon icon="mdi:check-circle-outline" size={14} ns={ns} />
            ) : status.tone === "err" ? (
              <SwIcon icon="mdi:alert-circle-outline" size={14} ns={ns} />
            ) : (
              <SwIcon icon="mdi:information-outline" size={14} ns={ns} />
            )}
            {status.message}
          </Typography>
        ) : null}
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
