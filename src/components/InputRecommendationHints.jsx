import { ISS_INPUT_RECOMMENDATION_EXT, recommendationSampleRequest } from "../lib/lookup/input-recommendation.js";
import { jsonPretty } from "../lib/openapi/openapi.js";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { useGlassColors, glassAccordionSx } from "../lib/ui/glass.jsx";
import { issFilterDialogProps, issFilterDialogHeader, loginFormContentSx, loginFormActionsSx } from "../lib/ui/glass-filter-dialog.js";

const { useState, useEffect, useMemo } = React;
const { Box, Typography, Chip, Tooltip, Dialog, DialogContent, DialogActions, Button, Accordion, AccordionSummary, AccordionDetails } = MaterialUI;

function RecommendationBody({ rec, ns }) {
  const { serverBase } = useServerBase();
  const sample = recommendationSampleRequest(rec, serverBase);
  const fJson = sample?.f ? jsonPretty(sample.f) : "";
  return (
    <Box className="isa-sw-input-rec__body">
      {rec.hint ? <Typography variant="body2" sx={{ mb: sample ? 0.75 : 0 }}>{rec.hint}</Typography> : null}
      {sample ? (
        <Box sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.78rem", lineHeight: 1.45, wordBreak: "break-all" }}>
          <Typography variant="caption" color="text.secondary" display="block">Endpoint</Typography>
          <Box component="pre" sx={{ m: 0, mb: fJson ? 0.75 : 0, whiteSpace: "pre-wrap" }}>{`${sample.method} ${sample.url.replace(/^https?:\/\/[^/]+/i, "")}`}</Box>
          {fJson ? (
            <>
              <Typography variant="caption" color="text.secondary" display="block">Filtro f (JSON)</Typography>
              <Box component="pre" sx={{ m: 0, mb: sample.fB64 ? 0.75 : 0, whiteSpace: "pre-wrap" }}>{fJson}</Box>
              {sample.fB64 ? (
                <>
                  <Typography variant="caption" color="text.secondary" display="block">f (Base64)</Typography>
                  <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap" }}>{sample.fB64}</Box>
                </>
              ) : null}
            </>
          ) : null}
        </Box>
      ) : null}
      {rec.dependsOn?.length ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
          Requiere: {rec.dependsOn.map((d) => `\`${d}\``).join(", ")}
        </Typography>
      ) : null}
    </Box>
  );
}

function RecommendationAccordion({ field, rec, ns, expanded, onChange, glassC }) {
  const hintPreview = rec.hint ? (String(rec.hint).length > 72 ? `${String(rec.hint).slice(0, 72)}…` : rec.hint) : "";
  return (
    <Accordion className="isa-sw-input-rec-acc" expanded={expanded} onChange={onChange} disableGutters elevation={0} sx={{ ...glassAccordionSx(glassC, { tone: "subtle" }), "&:before": { display: "none" }, borderRadius: "0.5rem !important", overflow: "hidden" }}>
      <AccordionSummary expandIcon={<SwIcon icon="mdi:chevron-down" size={20} ns={ns} />} sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.75, minWidth: 0 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 0.25 }}>
          <Typography variant="subtitle2" component="code" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem", fontWeight: 600 }}>{field}</Typography>
          {hintPreview ? <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hintPreview}</Typography> : null}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1.25, px: 1.5 }}>
        <RecommendationBody rec={rec} ns={ns} />
      </AccordionDetails>
    </Accordion>
  );
}

export function InputRecommendationHints({ schema, ns = "ISA" }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(false);
  const glassC = useGlassColors();
  const items = useMemo(() => {
    const props = schema?.properties;
    if (!props || typeof props !== "object") return [];
    return Object.entries(props)
      .map(([name, prop]) => ({ name, rec: prop?.[ISS_INPUT_RECOMMENDATION_EXT] }))
      .filter((item) => item.rec && typeof item.rec === "object");
  }, [schema]);

  useEffect(() => {
    if (open && items.length) setExpandedId(items[0].name);
  }, [open, items]);

  if (!items.length) return null;

  return (
    <>
      <Tooltip title="Ver tips para completar el body" arrow>
        <Chip className="isa-sw-input-rec-trigger" size="small" variant="outlined" clickable onClick={() => setOpen(true)} icon={<SwIcon icon="mdi:lightbulb-on-outline" size={14} ns={ns} />} label={`Tips (${items.length})`} />
      </Tooltip>
      <Dialog {...issFilterDialogProps({ open, onClose: () => setOpen(false), maxWidth: "md" })}>
        {issFilterDialogHeader(React, MaterialUI, { Icon: (props) => <SwIcon {...props} ns={ns} /> }, { title: "Recomendaciones de input", icon: "mdi:lightbulb-on-outline" })}
        <DialogContent sx={{ ...loginFormContentSx(), pt: 1, maxHeight: "70vh", overflow: "auto" }}>
          <Box className="isa-sw-input-rec-list" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {items.map(({ name, rec }) => (
              <RecommendationAccordion key={name} field={name} rec={rec} ns={ns} glassC={glassC} expanded={expandedId === name} onChange={(_, isExp) => setExpandedId(isExp ? name : false)} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ ...loginFormActionsSx(), gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function InputRecommendationChip({ rec, ns = "ISA", onApplyF }) {
  const { serverBase } = useServerBase();
  const sample = recommendationSampleRequest(rec, serverBase);
  if (!sample?.fB64 || !onApplyF) return null;
  return (
    <Tooltip title={`Aplicar filtro f recomendado (${sample.method} ${sample.path})`}>
      <Chip size="small" variant="outlined" clickable icon={<SwIcon icon="mdi:filter-check-outline" size={14} ns={ns} />} label="Usar f recomendado" onClick={() => onApplyF(sample.fB64)} />
    </Tooltip>
  );
}

export { ISS_INPUT_RECOMMENDATION_EXT };
