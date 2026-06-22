import { ISS_INPUT_RECOMMENDATION_EXT, recommendationSampleRequest } from "../lib/lookup/input-recommendation.js";
import { jsonPretty } from "../lib/openapi/openapi.js";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { SwIcon } from "../lib/ui/sw-icon.jsx";

const { Box, Typography, Chip, Tooltip } = MaterialUI;

function RecommendationCard({ field, rec, ns }) {
  const { serverBase } = useServerBase();
  const sample = recommendationSampleRequest(rec, serverBase);
  const fJson = sample?.f ? jsonPretty(sample.f) : "";
  return (
    <Box className="isa-sw-input-rec" sx={{ p: 1.25, borderRadius: 1, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <SwIcon icon="mdi:lightbulb-on-outline" size={14} ns={ns} />
        <Box component="code" sx={{ fontFamily: "inherit" }}>{field}</Box>
      </Typography>
      {rec.hint ? <Typography variant="body2" sx={{ mb: 0.75 }}>{rec.hint}</Typography> : null}
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

export function InputRecommendationHints({ schema, ns = "ISA" }) {
  const props = schema?.properties;
  if (!props || typeof props !== "object") return null;
  const items = Object.entries(props)
    .map(([name, prop]) => ({ name, rec: prop?.[ISS_INPUT_RECOMMENDATION_EXT] }))
    .filter((item) => item.rec && typeof item.rec === "object");
  if (!items.length) return null;
  return (
    <Box className="isa-sw-input-rec-list" sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
        <SwIcon icon="mdi:map-search-outline" size={14} ns={ns} />
        Recomendaciones de input
      </Typography>
      {items.map(({ name, rec }) => <RecommendationCard key={name} field={name} rec={rec} ns={ns} />)}
    </Box>
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
