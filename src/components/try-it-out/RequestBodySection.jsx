import { defaultTryItBodyText, formatBodyExample, resolveTryItBodyExample, resolveTryItBodyExamples, shouldShowTryItBody } from "../../lib/openapi/tryit-body.js";
import { InputRecommendationHints } from "../filters/InputRecommendationHints.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { TryItAttachmentsBar } from "./TryItAttachmentsBar.jsx";
import { resolveTryItAttachments, hasTryItAttachments } from "../../lib/openapi/tryit-attachments.js";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { collectElevatedOnlyFields } from "../../lib/openapi/elevated-only.js";

const { useState, useEffect, useRef, useMemo } = React;
const { Box, Typography, Chip, Alert } = MaterialUI;

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
  ns = "ISA",
  spec,
  attachments,
  onAttachmentsChange,
}) {
  const bodyOp = op || { requestBody, method, path };
  const show = shouldShowTryItBody(bodyOp);
  const attachConfig = useMemo(() => (show ? resolveTryItAttachments(bodyOp, spec) : null), [show, bodyOp, spec]);
  if (!show) return null;

  const example = specExample ?? resolveTryItBodyExample(bodyOp);
  const examplePretty = example !== undefined ? defaultTryItBodyText(bodyOp) : "{\n  \n}";
  const presets = resolveTryItBodyExamples(bodyOp);
  const bodySchema = bodyOp?.requestBody?.content?.["application/json"]?.schema;
  const elevatedOnlyFields = useMemo(() => collectElevatedOnlyFields(bodySchema), [bodySchema]);
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
      </Box>
      {hasTryItAttachments(attachConfig) ? (
        <TryItAttachmentsBar config={attachConfig} attachments={attachments} onChange={onAttachmentsChange} disabled={disabled} ns={ns} />
      ) : null}
      {elevatedOnlyFields.length ? (
        <Alert severity="info" icon={<SwIcon icon="mdi:shield-key-outline" size={16} ns={ns} />} className="isa-sw-request-body__elevated-only" sx={{ mb: 0.75, py: 0.5 }}>
          Campos reservados para ISS-devs / dev_lead: <strong>{elevatedOnlyFields.join(", ")}</strong>. Para otros perfiles el backend los descarta y aplica los valores operacionales.
        </Alert>
      ) : null}
      <JsonCodeBlock
        className="isa-sw-request-body__editor"
        value={raw}
        onChange={handleChange}
        readOnly={false}
        disabled={disabled}
        minHeight={BODY_EDITOR_MIN}
        maxHeight={BODY_EDITOR_MAX}
        placeholder='{ "campo": "valor" }'
      />
    </Box>
  );
}

