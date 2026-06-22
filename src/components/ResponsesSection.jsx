import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { extractJsonExample, jsonPretty, responseTone } from "../lib/openapi/openapi.js";
import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { respExpandIndex } from "../lib/nav/expand-stack.js";
import { useExpandStack } from "../context/ExpandStackContext.jsx";
import { useGlassColors, glassSurfaceSx } from "../lib/ui/glass.jsx";

const {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Box,
} = MaterialUI;

function toneColor(tone) {
  if (tone === "ok") return "success";
  if (tone === "auth") return "secondary";
  if (tone === "warn") return "warning";
  if (tone === "err") return "error";
  return "default";
}

export function ResponsesSection({ responses = {}, tagIndex, opIndex, ns = "ISA" }) {
  const codes = Object.keys(responses).sort();
  const { isOpen, toggle } = useExpandStack();
  const glassC = useGlassColors();

  if (!codes.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sin respuestas documentadas.
      </Typography>
    );
  }

  return (
    <Box className="isa-sw-responses" onClick={(e) => e.stopPropagation()}>
      {codes.map((code, respIdx) => {
        const resp = responses[code];
        const example = extractJsonExample(resp?.content?.["application/json"]);
        const tone = responseTone(code);
        const expandId = respExpandIndex(tagIndex, opIndex, respIdx);
        const expanded = isOpen(expandId);
        return (
          <Accordion
            key={code}
            expanded={expanded}
            onChange={(e, isExpanded) => {
              e.stopPropagation();
              toggle(expandId, isExpanded);
            }}
            data-sw-expand={expandId}
            className="isa-sw-resp-card"
            disableGutters
            sx={{
              ...glassSurfaceSx(glassC, { tone: "node", hover: false, radius: "0.75rem" }),
              mb: 0.5,
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              className={`isa-sw-resp-head isa-sw-resp--${tone}`}
              expandIcon={<SwIcon icon="mdi:chevron-down" size={20} ns={ns} />}
            >
              <Chip className="isa-sw-chip" label={code} size="small" color={toneColor(tone)} sx={{ mr: 1, fontWeight: 700 }} />
              <Typography variant="body2" color="text.secondary">
                {resp?.description || ""}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {example !== undefined ? (
                <JsonCodeBlock value={jsonPretty(example)} />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin ejemplo JSON.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
