import { MethodChip, TryItOutPanel } from "./TryItOutPanel.jsx";
import { RequestBodySection } from "./RequestBodySection.jsx";
import { ResponsesSection } from "./ResponsesSection.jsx";
import { DocPanel } from "./DocPanel.jsx";
import { ApiPathLabel } from "./ApiPathLabel.jsx";
import { extractJsonExample, operationRequiresBearer } from "../lib/openapi.js";
import { SwIcon, tabLabel } from "../lib/sw-icon.jsx";
import { opExpandIndex } from "../lib/expand-stack.js";
import { useExpandStack } from "../context/ExpandStackContext.jsx";
import { useGlassColors, glassAccordionSx, methodAccent } from "../lib/glass.jsx";

const { useState } = React;
const {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Tabs,
  Tab,
  Box,
} = MaterialUI;

export function OperationCard({
  tagIndex,
  opIndex,
  op,
  spec,
  docMd,
  lookupIndex,
  authEnabled,
  onNeedLogin,
  ns = "ISA",
}) {
  const [tab, setTab] = useState("try");
  const { isOpen, toggle } = useExpandStack();
  const expandId = opExpandIndex(tagIndex, opIndex);
  const expanded = isOpen(expandId);
  const glassC = useGlassColors();
  const accent = methodAccent(op.method);
  const specExample = extractJsonExample(op.requestBody?.content?.["application/json"]);
  const needsAuth = authEnabled && operationRequiresBearer(op, spec);

  const tabs = [
    { id: "try", label: "Try it out", icon: "mdi:play-circle-outline" },
    { id: "overview", label: "Resumen", icon: "mdi:file-document-outline" },
    { id: "doc", label: "Doc", icon: "mdi:book-open-page-variant" },
  ];

  return (
    <Accordion
      expanded={expanded}
      onChange={(e, v) => {
        e.stopPropagation();
        toggle(expandId, v);
      }}
      className={`isa-sw-operation isa-sw-operation--${op.method}`}
      data-sw-expand={expandId}
      disableGutters
      sx={{
        ...glassAccordionSx(glassC, { accent }),
        mb: 1,
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<SwIcon icon="mdi:chevron-down" size={22} ns={ns} />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", pr: 1 }}>
          <MethodChip method={op.method} />
          {needsAuth ? (
            <Box
              component="span"
              className="isa-sw-auth-lock"
              title="Requiere autenticación JWT"
              aria-label="Requiere autenticación JWT"
              sx={{ display: "inline-flex", color: "warning.main", opacity: 0.9, flexShrink: 0 }}
            >
              <SwIcon icon="mdi:lock-outline" size={16} ns={ns} />
            </Box>
          ) : null}
          <ApiPathLabel path={op.path} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1, minWidth: 0, opacity: 0.5 }}
            noWrap
          >
            {op.summary || op.description || ""}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {op.description ? (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, opacity: 0.5, display: "block" }}>
            {op.description}
          </Typography>
        ) : null}
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
        >
          {tabs.map((t) => (
            <Tab key={t.id} value={t.id} label={tabLabel(t.icon, t.label, ns)} />
          ))}
        </Tabs>

        {tab === "try" ? (
          <TryItOutPanel
            op={op}
            spec={spec}
            lookupIndex={lookupIndex}
            authEnabled={authEnabled}
            onNeedLogin={onNeedLogin}
            ns={ns}
          />
        ) : null}

        {tab === "overview" ? (
          <Box>
            <RequestBodySection requestBody={op.requestBody} example={specExample} disabled ns={ns} />
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 2, mb: 0.5 }}
            >
              <SwIcon icon="mdi:reply-outline" size={14} ns={ns} />
              Respuestas
            </Typography>
            <ResponsesSection
              responses={op.responses}
              tagIndex={tagIndex}
              opIndex={opIndex}
              ns={ns}
            />
          </Box>
        ) : null}

        {tab === "doc" ? <DocPanel markdown={docMd} /> : null}
      </AccordionDetails>
    </Accordion>
  );
}
