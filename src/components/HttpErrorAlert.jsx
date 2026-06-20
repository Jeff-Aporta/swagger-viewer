const { Alert, AlertTitle, Typography } = MaterialUI;

export function HttpErrorAlert({ message, severity = "error", sx }) {
  if (!message) return null;
  const lines = String(message)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  if (lines.length === 1) return <Alert severity={severity} sx={sx}>{lines[0]}</Alert>;
  return (
    <Alert severity={severity} sx={sx}>
      <AlertTitle sx={{ mb: 0.5 }}>{lines[0]}</AlertTitle>
      {lines.slice(1).map((line, i) => (
        <Typography key={i} variant="body2" component="div" sx={{ mt: i ? 0.5 : 0 }}>
          {line}
        </Typography>
      ))}
    </Alert>
  );
}
