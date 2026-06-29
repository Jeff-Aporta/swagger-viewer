// ClientTestTagGroup.jsx — Agrupa items de "tests agnósticos" en el UI del visor.
//
// A diferencia del OperationTagGroup regular (que se basa en spec.paths),
// este lee una lista de tests desde `config.clientTests` o desde
// `spec.viewer.client.tests` y renderiza cada uno como un TestCard.
//
// Cada test es `{ id, title, description, docs, steps: [...] }`.
// El visor interpreta los steps **directamente desde el JSON** — sin registry
// ni protocolo hardcoded. El servidor solo provee la API productiva.

import { ClientTestRunnerPanel } from "./ClientTestRunnerPanel.jsx";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Chip } = MaterialUI;

/** Una sola card de test agnóstico. */
function TestCard({ test, index, authEnabled, onNeedLogin, ns = "ISA" }) {
    const [expanded, setExpanded] = useState(false);
    const steps = Array.isArray(test?.steps) ? test.steps : [];
    return (
        <Accordion
            expanded={expanded}
            onChange={(_e, v) => setExpanded(v)}
            className="isa-sw-operation isa-sw-operation--test"
            sx={{
                mb: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "background.paper",
                boxShadow: "none",
                "&:before": { display: "none" },
                overflow: "hidden",
            }}
        >
            <AccordionSummary expandIcon={<SwIcon icon="mdi:chevron-down" size={22} ns={ns} />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", pr: 1 }}>
                    <Box className="isa-sw-method-chip isa-sw-method-chip--test" sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 56, height: 24, px: 1, borderRadius: 1, bgcolor: "warning.main", color: "warning.contrastText", fontWeight: 700, fontSize: "0.7rem", letterSpacing: 0.5 }}>
                        TEST
                    </Box>
                    <SwIcon icon="mdi:test-tube" size={18} ns={ns} style={{ color: "var(--mui-palette-warning-main)" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 0, whiteSpace: "nowrap" }}>{test?.title || test?.id || "Test"}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0, opacity: 0.6 }} noWrap>{test?.description || ""}</Typography>
                    <Chip size="small" label={`${steps.length} steps`} variant="outlined" />
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <ClientTestRunnerPanel
                    test={test}
                    authEnabled={authEnabled}
                    onNeedLogin={onNeedLogin}
                    ns={ns}
                />
            </AccordionDetails>
        </Accordion>
    );
}

/** Tag-group "Testing" en el visor. Agrupa los tests agnósticos. */
export function ClientTestTagGroup({ tests, tagIndex = 0, authEnabled, onNeedLogin, ns = "ISA" }) {
    if (!Array.isArray(tests) || !tests.length) return null;
    return (
        <Box
            component="section"
            className="isa-sw-tag-group isa-sw-tag-group--testing"
            sx={{ mb: 3, mt: 0, "--isa-sw-tag-accent": "#f59e0b" }}
        >
            <Box className="isa-sw-tag-head">
                <Box className="isa-sw-tag-head__icon" aria-hidden>
                    <SwIcon icon="mdi:test-tube" size={22} ns={ns} style={{ color: "#f59e0b" }} />
                </Box>
                <Box className="isa-sw-tag-head__text">
                    <Typography component="h2" className="isa-sw-tag-head__title" variant="h6">
                        Testing
                    </Typography>
                    <Typography component="p" className="isa-sw-tag-head__desc" variant="caption" color="text.secondary">
                        Tests agnósticos que corren 100% en el cliente. El servidor solo provee la API productiva.
                    </Typography>
                </Box>
                <Chip
                    className="isa-sw-chip isa-sw-tag-head__count"
                    size="small"
                    label={`${tests.length} test${tests.length === 1 ? "" : "s"}`}
                    variant="outlined"
                />
            </Box>
            <Box className="isa-sw-tag-group__ops">
                {tests.map((t, i) => (
                    <TestCard
                        key={t.id || t.title || i}
                        test={t}
                        index={i}
                        authEnabled={authEnabled}
                        onNeedLogin={onNeedLogin}
                        ns={ns}
                    />
                ))}
            </Box>
        </Box>
    );
}

/**
 * Helper: extrae los tests agnósticos desde un spec o config.
 * Acepta múltiples formas para retro-compat:
 *   - viewer.client.tests
 *   - spec.client.tests / config.client.tests
 *   - clientTests
 *
 * Cada test queda normalizado a: { id, title, description, docs, steps, tags, subgroup }.
 */
export function readClientTestsFromSpec(specOrConfig) {
    if (!specOrConfig) return [];
    const arr = specOrConfig?.client?.tests
        || specOrConfig?.viewer?.client?.tests
        || specOrConfig?.spec?.client?.tests
        || specOrConfig?.config?.client?.tests
        || specOrConfig?.clientTests
        || [];
    if (!Array.isArray(arr)) return [];
    return arr
        .filter((t) => t && Array.isArray(t.steps) && t.steps.length > 0)
        .map((t) => ({
            id: t.id || t.name || "",
            title: t.title || t.name || t.id || "Test",
            description: t.description || "",
            docs: t.docs || "",
            tags: Array.isArray(t.tags) ? t.tags : [],
            subgroup: t.subgroup || "",
            steps: t.steps,
        }));
}
