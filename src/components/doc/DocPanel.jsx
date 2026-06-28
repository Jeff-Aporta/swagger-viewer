import { renderMarkdown } from "../../lib/ui/markdown.js";

const { Box, Typography } = MaterialUI;

/** Documentación extendida (x-iss-doc-md): Markdown con soporte de bloques HTML embebidos. */
export function DocPanel({ markdown }) {
  const text = String(markdown || "").trim();
  if (!text) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin documentación extendida para este endpoint.
      </Typography>
    );
  }

  return (
    <Box
      className="isa-sw-doc-panel"
      sx={{
        maxHeight: "80vh",
        overflow: "auto",
        typography: "body2",
        lineHeight: 1.55,
        "& pre": { overflow: "auto", p: 1, borderRadius: "0.5rem", bgcolor: "action.hover" },
        "& code": { fontFamily: "ui-monospace, monospace", fontSize: "0.85em" },
        "& table": { width: "100%", borderCollapse: "collapse", my: 1 },
        "& th, & td": { border: "1px solid", borderColor: "divider", px: 1, py: 0.5, textAlign: "left" },
        "& ul, & ol": { pl: 2.5, my: 0.75 },
        "& blockquote": { borderLeft: 3, borderColor: "divider", pl: 1.5, my: 1, color: "text.secondary" },
      }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}
