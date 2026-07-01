/**
 * Modal/drawer de detalle por step de testing — JSON crudo de request/response,
 * prompt, output del script, etc. Apertura desde el botón "Ver detalle" del driver.
 */
const { useState, useMemo } = React;
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors } from "../../lib/ui/glass.jsx";

const { Dialog, DialogTitle, DialogContent, DialogActions, Box, Stack, Chip, Tabs, Tab, Button, IconButton, Tooltip, Typography, Alert } = MaterialUI;

function prettyJson(value) {
    if (value == null) return "";
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function buildStepSections(step) {
    const sections = [];
    if (step.kind === "conv") {
        sections.push({ id: "request", label: "Request", icon: "mdi:arrow-up-bold-circle-outline", body: { prompt: step.prompt, iconversacion: step.iconversacion ?? null } });
        sections.push({ id: "response", label: "Response", icon: "mdi:arrow-down-bold-circle-outline", body: { delta: step.delta ?? null, titulo: step.titulo ?? null, iconversacion: step.iconversacion ?? null, titleChange: step.titleChange ?? null } });
        if (step.error) sections.push({ id: "error", label: "Error", icon: "mdi:alert-circle-outline", body: step.error });
    } else if (step.kind === "http" || step.kind === "raw") {
        sections.push({ id: "request", label: "Request", icon: "mdi:arrow-up-bold-circle-outline", body: { method: step.method ?? null, path: step.path ?? null } });
        sections.push({ id: "response", label: "Response", icon: "mdi:arrow-down-bold-circle-outline", body: { status: step.status ?? null, body: step.body ?? null } });
        if (step.error) sections.push({ id: "error", label: "Error", icon: "mdi:alert-circle-outline", body: step.error });
    } else if (step.kind === "script") {
        sections.push({ id: "code", label: "Code", icon: "mdi:code-tags", body: step.run ?? "" });
        sections.push({ id: "output", label: "Output", icon: "mdi:console-line", body: { output: step.output ?? null, verdict: step.verdict ?? null } });
        if (step.error) sections.push({ id: "error", label: "Error", icon: "mdi:alert-circle-outline", body: step.error });
    } else {
        sections.push({ id: "raw", label: "Step", icon: "mdi:information-outline", body: step });
    }
    sections.push({ id: "meta", label: "Meta", icon: "mdi:clock-outline", body: { startedAt: step.startedAt ?? null, endedAt: step.endedAt ?? null, duration: step.duration ?? null, kind: step.kind, index: step.index } });
    return sections;
}

export function TestingStepDetail({ step, open, onClose, ns = "ISS" }) {
    const c = useGlassColors();
    const [tab, setTab] = useState("request");
    const sections = useMemo(() => (step ? buildStepSections(step) : []), [step]);
    const visible = sections.find((s) => s.id === tab) || sections[0];

    if (!step) return null;

    async function copy(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            /* ignore */
        }
    }

    const isErrTab = visible?.id === "error";

    return (
        <Dialog
            open={!!open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: "0.75rem",
                    background: c.cardHi,
                    border: `1px solid ${c.border}`,
                    boxShadow: "0 12px 48px rgba(0,0,0,0.32)",
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                <SwIcon icon="mdi:debug-step-over" size={20} ns={ns} aria-hidden />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component="span" sx={{ fontWeight: 600 }}>
                        Step #{step.index} · {step.kind}
                    </Typography>
                    {step.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {step.description}
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={0.5}>
                    <Chip size="small" label={step.ok ? "OK" : "FAIL"} color={step.ok ? "success" : "error"} variant="outlined" />
                    {step.duration != null && (
                        <Chip size="small" label={`${Math.round(step.duration)} ms`} variant="outlined" icon={<SwIcon icon="mdi:timer-outline" size={12} ns={ns} />} />
                    )}
                </Stack>
                <Tooltip title="Cerrar">
                    <IconButton size="small" onClick={onClose} aria-label="Cerrar detalle">
                        <SwIcon icon="mdi:close" size={18} ns={ns} />
                    </IconButton>
                </Tooltip>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Tabs
                    value={visible?.id || "request"}
                    onChange={(_e, v) => setTab(v)}
                    variant="scrollable"
                    allowScrollButtonsMobile
                    sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
                >
                    {sections.map((s) => (
                        <Tab
                            key={s.id}
                            value={s.id}
                            icon={<SwIcon icon={s.icon} size={14} ns={ns} aria-hidden />}
                            iconPosition="start"
                            label={s.label}
                            sx={{ minHeight: 44, fontSize: "0.78rem", textTransform: "none" }}
                        />
                    ))}
                </Tabs>
                <Box sx={{ position: "relative" }}>
                    <Tooltip title="Copiar">
                        <IconButton
                            size="small"
                            onClick={() => copy(prettyJson(visible?.body))}
                            sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
                            aria-label="Copiar contenido"
                        >
                            <SwIcon icon="mdi:content-copy" size={16} ns={ns} />
                        </IconButton>
                    </Tooltip>
                    {isErrTab ? (
                        <Alert severity="error" sx={{ m: 2, whiteSpace: "pre-wrap" }}>
                            {String(visible?.body ?? "")}
                        </Alert>
                    ) : (
                        <Box
                            component="pre"
                            className="isa-sw-json-block"
                            sx={{
                                m: 0,
                                p: 2,
                                fontFamily: "ui-monospace, monospace",
                                fontSize: "0.78rem",
                                lineHeight: 1.55,
                                whiteSpace: "pre",
                                overflow: "auto",
                                maxHeight: "60vh",
                                background: c.preBg,
                                color: c.text,
                            }}
                        >
                            {prettyJson(visible?.body)}
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2 }}>
                <Button onClick={onClose} size="small">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}