import { defaultTryItBodyText, formatBodyExample, resolveTryItBodyExample, resolveTryItBodyExamples, shouldShowTryItBody } from "../../lib/openapi/tryit-body.js";
import { InputRecommendationHints } from "../filters/InputRecommendationHints.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { useState, useEffect, useRef } = React;
const { Box, Typography, Chip, CircularProgress } = MaterialUI;

const BODY_EDITOR_MIN = "11rem";
const BODY_EDITOR_MAX = "40vh";

export function RequestBodySection({
  op,
  requestBody,
  method,
  path,
  example: specExample,
  bodyText,
  onBodyChange,
  disabled,
  loading = false,
  ns = "ISA",
}) {
  const bodyOp = op || { requestBody, method, path };
  if (!shouldShowTryItBody(bodyOp)) return null;

  const example = specExample ?? resolveTryItBodyExample(bodyOp);
  const examplePretty = example !== undefined ? defaultTryItBodyText(bodyOp) : "{\n  \n}";
  const presets = resolveTryItBodyExamples(bodyOp);
  const bodySchema = bodyOp?.requestBody?.content?.["application/json"]?.schema;
  const [raw, setRaw] = useState(bodyText ?? examplePretty);
  const seededRef = useRef(false);

  useEffect(() => {
    seededRef.current = false;
  }, [bodyOp.method, bodyOp.path, bodyOp.requestBody]);

  useEffect(() => {
    if (bodyText !== undefined && String(bodyText).length) {
      setRaw(bodyText);
      return;
    }
    if (!examplePretty || seededRef.current) return;
    seededRef.current = true;
    setRaw(examplePretty);
    onBodyChange?.(examplePretty);
  }, [bodyText, examplePretty, onBodyChange]);

  function handleChange(text) {
    setRaw(text);
    onBodyChange?.(text);
  }

  function applyPreset(preset) {
    const text = formatBodyExample(preset?.example);
    setRaw(text);
    onBodyChange?.(text);
  }

  return (
    <Box className="isa-sw-request-body" sx={{ mt: 1.5 }}>
      <Box className="isa-sw-request-body__head" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75, mb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mr: presets.length ? 0.5 : 0 }}>
          <SwIcon icon="mdi:code-json" size={14} ns={ns} />
          Body raw · JSON
        </Typography>
        {presets.length > 0 && (
          <Box className="isa-sw-request-body__examples" sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
            {presets.map((preset) => (
              <Chip
                key={preset.id || preset.label}
                className="isa-sw-request-body__example-chip"
                size="small"
                variant="outlined"
                disabled={disabled}
                clickable={!disabled}
                onClick={() => applyPreset(preset)}
                icon={preset.icon ? <SwIcon icon={preset.icon} size={14} ns={ns} /> : undefined}
                label={preset.label}
              />
            ))}
          </Box>
        )}
        <InputRecommendationHints schema={bodySchema} ns={ns} />
        {loading ? <CircularProgress size={14} sx={{ ml: 0.5 }} aria-label="Cargando body desde GET" /> : null}
      </Box>
      <JsonCodeBlock
        className="isa-sw-request-body__editor"
        value={raw}
        onChange={handleChange}
        readOnly={false}
        disabled={disabled || loading}
        minHeight={BODY_EDITOR_MIN}
        maxHeight={BODY_EDITOR_MAX}
        placeholder='{ "campo": "valor" }'
      />
    </Box>
  );
}

