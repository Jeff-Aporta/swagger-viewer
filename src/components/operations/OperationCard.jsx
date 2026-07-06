import { MethodChip, TryItOutPanel } from "../try-it-out/TryItOutPanel.jsx";
import { ResponsesSection } from "../try-it-out/ResponsesSection.jsx";
import { DocPanel } from "../doc/DocPanel.jsx";
import { ApiPathLabel } from "./ApiPathLabel.jsx";
import { ClientTestRunnerPanel } from "../tester/ClientTestRunnerPanel.jsx";
import { operationRequiresBearer } from "../../lib/openapi/openapi.js";
import { SwIcon, tabLabel } from "../../lib/ui/sw-icon.jsx";
import { opExpandIndex } from "../../lib/nav/expand-stack.js";
import { OP_TAB_DEFAULT, OP_TAB_IDS, readOpTabFromUrl, subscribeOpTabUrl, writeOpTabToUrl } from "../../lib/nav/operation-tab-url.js";
import { useExpandStack } from "../../context/ExpandStackContext.jsx";
import { useGlassColors, glassAccordionSx, methodAccent } from "../../lib/ui/glass.jsx";

const { useState, useEffect } = React;
const {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Tabs,
  Tab,
  Box,
  Tooltip,
} = MaterialUI;

const AUTH_LOCK_TIP =
  "Requiere Authorization: Bearer <JWT>. Use Iniciar sesión o Pegar JWT en la barra superior.";

export function OperationCard({
  tagIndex,
  opIndex,
  op,
  spec,
  docMd,
  lookupIndex,
  catalogDocKeys,
  authEnabled,
  onNeedLogin,
  ns = "ISA",
}) {
  const { isOpen, toggle } = useExpandStack();
  const expandId = opExpandIndex(tagIndex, opIndex);
  const expanded = isOpen(expandId);
  const [tab, setTab] = useState(() => readOpTabFromUrl(expandId) || OP_TAB_DEFAULT);
  const glassC = useGlassColors();
  const accent = methodAccent(op.method);
  const needsAuth = authEnabled && operationRequiresBearer(op, spec);

  useEffect(() => {
    return subscribeOpTabUrl(() => {
      const next = readOpTabFromUrl(expandId);
      setTab(OP_TAB_IDS.includes(next) ? next : OP_TAB_DEFAULT);
    });
  }, [expandId]);

  function onTabChange(_e, v) {
    const safe = OP_TAB_IDS.includes(v) ? v : OP_TAB_DEFAULT;
    setTab(safe);
    writeOpTabToUrl(expandId, safe);
  }

  const isClientTest = !!(op?._clientTest || op?.["x-iss-client-test"] || op?._clientProtocol || op?.["x-iss-client-protocol"]);
  const tabs = isClientTest
    ? [
        { id: "test", label: "Tester", icon: "mdi:test-tube" },
        { id: "doc", label: "Doc", icon: "mdi:book-open-page-variant" },
      ]
    : [
        { id: "try", label: "Probar", icon: "mdi:play-circle-outline" },
        { id: "overview", label: "Ejemplos", icon: "mdi:file-document-outline" },
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
      elevation={0}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{
        ...glassAccordionSx(glassC, { accent }),
        mb: 1,
        overflow: "hidden",
        "--Paper-shadow": "none",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<SwIcon icon="mdi:chevron-down" size={22} ns={ns} />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", pr: 1 }}>
          <MethodChip method={op.method} />
          {needsAuth ? (
            <Tooltip title={AUTH_LOCK_TIP} arrow placement="top">
              <Box
                component="span"
                className="isa-sw-auth-lock"
                aria-label={AUTH_LOCK_TIP}
                sx={{ display: "inline-flex", color: "warning.main", opacity: 0.9, flexShrink: 0 }}
              >
                <SwIcon icon="mdi:lock-outline" size={16} ns={ns} />
              </Box>
            </Tooltip>
          ) : null}
          <ApiPathLabel path={op.path} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1, minWidth: 0, opacity: 0.5 }}
            noWrap
          >
            {[op.summary, op.description].filter(Boolean).join(" · ") || ""}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {expanded ? (
          <>
            {op.description && !op.summary ? (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, opacity: 0.5, display: "block" }}>
                {op.description}
              </Typography>
            ) : null}
            <Tabs
              value={tab}
              onChange={onTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
            >
              {tabs.map((t) => (
                <Tab key={t.id} value={t.id} label={tabLabel(t.icon, t.label, ns)} />
              ))}
            </Tabs>

            {tab === "try" && !isClientTest ? (
              <TryItOutPanel
                op={op}
                spec={spec}
                lookupIndex={lookupIndex}
                catalogDocKeys={catalogDocKeys}
                expandId={expandId}
                authEnabled={authEnabled}
                onNeedLogin={onNeedLogin}
                ns={ns}
              />
            ) : null}

            {tab === "test" && isClientTest ? (
              <ClientTestRunnerPanel
                test={op?._clientTest}
                docMd={docMd}
                authEnabled={authEnabled}
                onNeedLogin={onNeedLogin}
                ns={ns}
              />
            ) : null}

            {tab === "overview" && !isClientTest ? (
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                  <SwIcon icon="mdi:reply-outline" size={14} ns={ns} />
                  Respuestas
                </Typography>
                <ResponsesSection responses={op.responses} tagIndex={tagIndex} opIndex={opIndex} ns={ns} />
              </Box>
            ) : null}

            {tab === "doc" ? <DocPanel markdown={docMd} /> : null}
          </>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}
