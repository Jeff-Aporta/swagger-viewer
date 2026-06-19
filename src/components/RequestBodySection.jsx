import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { extractJsonExample, jsonPretty } from "../lib/openapi.js";
import { SwIcon } from "../lib/sw-icon.jsx";

const { useState, useEffect } = React;
const { Box, Typography, TextField } = MaterialUI;

export function RequestBodySection({ requestBody, example: specExample, bodyText, onBodyChange, disabled, ns = "ISA" }) {
  const media = requestBody?.content?.["application/json"];
  const example = specExample ?? extractJsonExample(media);
  const [raw, setRaw] = useState(bodyText ?? (example !== undefined ? jsonPretty(example) : ""));

  useEffect(() => {
    if (bodyText !== undefined) setRaw(bodyText);
  }, [bodyText]);

  if (!requestBody) return null;

  return (
    <Box className="isa-sw-request-body" sx={{ mt: 1.5 }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}
      >
        <SwIcon icon="mdi:code-json" size={14} ns={ns} />
        Body (application/json)
      </Typography>
      {example !== undefined ? (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Ejemplo del spec
          </Typography>
          <JsonCodeBlock value={jsonPretty(example)} minHeight="6rem" />
        </Box>
      ) : null}
      <TextField
        label="Body raw"
        multiline
        minRows={4}
        fullWidth
        size="small"
        disabled={disabled}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          onBodyChange?.(e.target.value);
        }}
        inputProps={{ style: { fontFamily: "ui-monospace, monospace", fontSize: 12 } }}
      />
    </Box>
  );
}
