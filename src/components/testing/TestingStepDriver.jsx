/**
 * Driver de presentación por step — un componente especializado por kind
 * (conv | http | raw | script). Cada driver muestra los campos relevantes
 * del step en un grid alineado (status con #idx / método / body / duración
 * hh:mm:ss / timestamp / acción "info"), con botón "Ver detalle" que abre
 * el modal.
 *
 * Los datos vienen del StepResult producido por src/lib/test-runner/runner.mjs.
 */
const { useState } = React;
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors, methodAccent } from "../../lib/ui/glass.jsx";
import { TestingStepDetail } from "./TestingStepDetail.jsx";

const { Box, Stack, Chip, Tooltip, Typography, IconButton, Button } = MaterialUI;

function relativeTime(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diff = Date.now() - t;
    if (diff < 1000) return "ahora";
    if (diff < 60_000) return `hace ${Math.round(diff / 1000)}s`;
    if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)}m`;
    return `hace ${Math.round(diff / 3_600_000)}h`;
}

function clockTime(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
        return "—";
    }
}

/** hh:mm:ss.ms — siempre 3 dígitos para ms, ms últimos 3 dígitos. */
function formatHmsMs(ms) {
    if (ms == null || !Number.isFinite(ms)) return "—";
    const total = Math.max(0, Math.round(ms));
    const h = Math.floor(total / 3_600_000);
    const m = Math.floor((total % 3_600_000) / 60_000);
    const s = Math.floor((total % 60_000) / 1000);
    const mss = total % 1000;
    const pad2 = (n) => String(n).padStart(2, "0");
    const pad3 = (n) => String(n).padStart(3, "0");
    if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(mss)}`;
    return `${pad2(m)}:${pad2(s)}.${pad3(mss)}`;
}

function durationChip(duration, ns) {
    const txt = formatHmsMs(duration);
    let color = "default";
    let icon = "mdi:timer-outline";
    const ms = Math.round(duration ?? 0);
    if (ms > 5000) {
        color = "warning";
        icon = "mdi:timer-alert-outline";
    } else if (ms > 15000) {
        color = "error";
        icon = "mdi:timer-sand";
    }
    return <Chip size="small" variant="outlined" color={color} icon={<SwIcon icon={icon} size={12} ns={ns} />} label={txt} sx={{ height: 22, fontFamily: "ui-monospace, monospace" }} />;
}

function statusBadge(step, ns) {
    const idxLabel = `#${String(step.index).padStart(2, "0")}`;
    return step.ok ? (
        <Chip
            size="small"
            color="success"
            icon={<SwIcon icon="mdi:check-circle" size={14} ns={ns} />}
            label={idxLabel}
            title="OK"
            sx={{ fontWeight: 700, height: 24, fontFamily: "ui-monospace, monospace" }}
        />
    ) : (
        <Chip
            size="small"
            color="error"
            icon={<SwIcon icon="mdi:close-circle" size={14} ns={ns} />}
            label={idxLabel}
            title="FAIL"
            sx={{ fontWeight: 700, height: 24, fontFamily: "ui-monospace, monospace" }}
        />
    );
}

function kindBadge(kind, ns) {
    const map = {
        conv: { icon: "mdi:message-text-outline", color: "#a855f7" },
        http: { icon: "mdi:web", color: "#1e90ff" },
        raw: { icon: "mdi:code-json", color: "#94a3b8" },
        script: { icon: "mdi:script-text-outline", color: "#22c55e" },
    };
    const def = map[kind] || { icon: "mdi:help-circle-outline", color: "#94a3b8" };
    return (
        <Chip
            size="small"
            variant="outlined"
            icon={<SwIcon icon={def.icon} size={12} ns={ns} />}
            label={kind.toUpperCase()}
            sx={{ height: 22, borderColor: def.color, color: def.color, fontWeight: 600 }}
        />
    );
}

function stepShell(step, driver, ns) {
    const c = useGlassColors();
    const [detailOpen, setDetailOpen] = useState(false);

    const rowBg = step.ok ? c.cardBg : c.errTint;
    const rowBorder = step.ok ? c.border : "rgba(239, 68, 68, 0.35)";

    return (
        <Box
            className="isa-sw-testing-driver-row"
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 96px", sm: "auto 1fr 116px 56px" },
                gridTemplateAreas: {
                    xs: `"body status" "meta meta"`,
                    sm: `"status body duration info"`,
                },
                columnGap: 1.25,
                rowGap: 0.75,
                alignItems: "center",
                p: 1.25,
                borderRadius: 1,
                background: rowBg,
                border: `1px solid ${rowBorder}`,
                transition: "border-color .15s, transform .15s",
                "&:hover": {
                    borderColor: step.ok ? "#a855f7" : "#ef4444",
                    transform: "translateY(-1px)",
                },
            }}
        >
            {/* status (#idx integrado) + kind */}
            <Box sx={{ gridArea: "status", display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
                {statusBadge(step, ns)}
                {kindBadge(step.kind, ns)}
            </Box>

            {/* body */}
            <Box sx={{ gridArea: "body", minWidth: 0 }}>
                {driver}
            </Box>

            {/* duración hh:mm:ss.ms */}
            <Box sx={{ gridArea: "duration", display: { xs: "none", sm: "flex" }, justifyContent: "flex-end", alignItems: "center" }}>
                {durationChip(step.duration, ns)}
            </Box>

            {/* botón info detalle */}
            <Box sx={{ gridArea: "info", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <Tooltip arrow title="Ver detalle (request / response / meta)">
                    <IconButton size="small" onClick={() => setDetailOpen(true)} aria-label="Ver detalle del step" sx={{ color: "primary.main" }}>
                        <SwIcon icon="mdi:information-outline" size={18} ns={ns} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* xs meta row (timestamp + duración + botón) */}
            <Box sx={{ gridArea: "meta", display: { xs: "flex", sm: "none" }, gap: 1, alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    {durationChip(step.duration, ns)}
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "ui-monospace, monospace", fontSize: "0.7rem" }}>
                        {clockTime(step.startedAt)} · {relativeTime(step.startedAt)}
                    </Typography>
                </Stack>
                <Button size="small" onClick={() => setDetailOpen(true)} startIcon={<SwIcon icon="mdi:information-outline" size={14} ns={ns} />}>
                    Detalle
                </Button>
            </Box>

            <TestingStepDetail step={step} open={detailOpen} onClose={() => setDetailOpen(false)} ns={ns} />
        </Box>
    );
}

/** Driver para kind="conv" — POST /conversacion. Muestra prompt enviado + delta recibido. */
function ConvDriverInner({ step, ns }) {
    const c = useGlassColors();
    const titleChanged = !!step.titleChange;
    const prompt = typeof step.prompt === "string" ? step.prompt : null;
    return (
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <Tooltip arrow title={`POST ${ns}/conversacion`}>
                    <Chip
                        size="small"
                        label="POST"
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, background: methodAccent("post"), color: "#fff" }}
                    />
                </Tooltip>
                {step.iconversacion != null && (
                    <Chip
                        size="small"
                        variant="outlined"
                        icon={<SwIcon icon="mdi:key-variant" size={10} ns={ns} />}
                        label={`iconv ${step.iconversacion}`}
                        sx={{ height: 18, fontSize: "0.65rem", fontFamily: "ui-monospace, monospace" }}
                    />
                )}
            </Stack>
            {step.description && (
                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {step.description}
                </Typography>
            )}
            {prompt && (
                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <SwIcon icon="mdi:arrow-up-bold" size={12} ns={ns} sx={{ color: "#1e90ff", mt: "2px", flexShrink: 0 }} />
                    <Typography
                        variant="caption"
                        component="span"
                        sx={{
                            fontFamily: "ui-monospace, monospace",
                            color: "#1e90ff",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {prompt}
                    </Typography>
                </Stack>
            )}
            {step.delta && (
                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <SwIcon icon="mdi:arrow-down-bold" size={12} ns={ns} sx={{ color: "#a855f7", mt: "2px", flexShrink: 0 }} />
                    <Typography
                        variant="caption"
                        component="span"
                        sx={{
                            fontFamily: "ui-monospace, monospace",
                            color: "text.secondary",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {step.delta.slice(0, 320)}{step.delta.length > 320 ? "…" : ""}
                    </Typography>
                </Stack>
            )}
            {titleChanged && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "#f59e0b" }}>
                    <SwIcon icon="mdi:rename-box" size={14} ns={ns} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        título: <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{step.titleChange.from ?? "(vacío)"}</span>{" "}
                        → <strong>{step.titleChange.to}</strong>
                    </Typography>
                </Stack>
            )}
            {step.error && (
                <Typography variant="caption" color="error.main" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {step.error}
                </Typography>
            )}
        </Stack>
    );
}

/** Driver para kind="http" o kind="raw". */
function HttpDriverInner({ step, ns }) {
    const c = useGlassColors();
    const method = String(step.method || "GET").toLowerCase();
    const accent = methodAccent(method);
    const statusColor = step.status >= 500 ? "error" : step.status >= 400 ? "warning" : step.status >= 300 ? "info" : "success";
    return (
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                <Chip
                    size="small"
                    label={method.toUpperCase()}
                    sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, background: accent, color: "#fff" }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        fontFamily: "ui-monospace, monospace",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                        flex: 1,
                    }}
                >
                    {step.path}
                </Typography>
                {step.status != null && (
                    <Chip
                        size="small"
                        color={statusColor}
                        label={step.status}
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}
                    />
                )}
            </Stack>
            {step.description && (
                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {step.description}
                </Typography>
            )}
            {step.error && (
                <Typography variant="caption" color="error.main" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {step.error}
                </Typography>
            )}
        </Stack>
    );
}

/** Driver para kind="script" — código del juez. */
function ScriptDriverInner({ step, ns }) {
    const c = useGlassColors();
    const hasVerdict = !!step.verdict;
    return (
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
                <SwIcon icon="mdi:script-text-outline" size={14} ns={ns} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Juez · script
                </Typography>
                {hasVerdict && (
                    <Chip
                        size="small"
                        color={step.verdict.pass ? "success" : "error"}
                        label={step.verdict.pass ? "verdict PASS" : "verdict FAIL"}
                        sx={{ height: 18, fontSize: "0.65rem" }}
                    />
                )}
            </Stack>
            {step.description && (
                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {step.description}
                </Typography>
            )}
            {step.run && (
                <Box
                    component="pre"
                    sx={{
                        m: 0,
                        p: 0.75,
                        fontFamily: "ui-monospace, monospace",
                        fontSize: "0.7rem",
                        background: c.preBg,
                        border: `1px solid ${c.border}`,
                        borderRadius: 0.75,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "pre",
                        lineHeight: 1.4,
                        maxHeight: 60,
                    }}
                >
                    {step.run.slice(0, 240)}{step.run.length > 240 ? "…" : ""}
                </Box>
            )}
            {step.error && (
                <Typography variant="caption" color="error.main" sx={{ fontFamily: "ui-monospace, monospace" }}>
                    {step.error}
                </Typography>
            )}
        </Stack>
    );
}

export function TestingStepDriver({ step, ns = "ISS" }) {
    if (!step) return null;
    let driver = null;
    if (step.kind === "conv") driver = <ConvDriverInner step={step} ns={ns} />;
    else if (step.kind === "http" || step.kind === "raw") driver = <HttpDriverInner step={step} ns={ns} />;
    else if (step.kind === "script") driver = <ScriptDriverInner step={step} ns={ns} />;
    else driver = (
        <Typography variant="body2" sx={{ fontFamily: "ui-monospace, monospace" }}>
            kind={step.kind}
        </Typography>
    );
    return stepShell(step, driver, ns);
}