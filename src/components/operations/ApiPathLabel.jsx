const { Typography, Box } = MaterialUI;

const PATH_PARAM_RE = /(\{[^}]+\})/g;

/** Ruta OpenAPI con `{param}` resaltado. */
export function ApiPathLabel({ path }) {
  const parts = String(path || "").split(PATH_PARAM_RE).filter((p) => p !== "");

  return (
    <Typography
      component="span"
      className="isa-sw-path"
      sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, fontSize: 14 }}
    >
      {parts.map((part, i) =>
        part.startsWith("{") && part.endsWith("}") ? (
          <Box
            component="span"
            key={`${part}-${i}`}
            className="isa-sw-path-var"
            sx={{
              color: "rgb(var(--isa-sw-accent, 30, 144, 255))",
              fontWeight: 700,
            }}
          >
            {part}
          </Box>
        ) : (
          <Box component="span" key={`${part}-${i}`}>
            {part}
          </Box>
        ),
      )}
    </Typography>
  );
}
