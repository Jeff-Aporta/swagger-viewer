import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Box, Typography } = MaterialUI;

export function InfoHeader({ spec, showTitle = true, ns = "ISA" }) {
  const info = spec?.info || {};
  const hasTitle = showTitle;
  const hasDescription = !!String(info.description || "").trim();

  if (!hasTitle && !hasDescription) return null;

  return (
    <Box className="isa-sw-info" sx={{ mb: 2 }}>
      {hasTitle ? (
        <Typography
          variant="h4"
          component="h1"
          fontWeight={700}
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <SwIcon icon="mdi:api" size={28} ns={ns} />
          {info.title || "API"}
        </Typography>
      ) : null}
      {hasDescription ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 1.5, whiteSpace: "pre-wrap", display: "flex", alignItems: "flex-start", gap: 1 }}
        >
          <SwIcon icon="mdi:text-box-outline" size={18} ns={ns} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{info.description}</span>
        </Typography>
      ) : null}
    </Box>
  );
}
