/**
 * Panel Testing del visor IS-Swagger.
 * Carga GET /system/testing.json y renderiza una card por test, con:
 *   - métricas declarativas (`verdict.metrics`, populadas por el runner)
 *   - tools declarativas (`test.tools`, renderizadas vía TestingTool)
 *   - progress bar en vivo
 *   - driver por step (conv | http | raw | script)
 *   - tabla de filas registradas (`test.table` + step.record)
 *   - alert final con el verdict formateado
 *
 * El runner ejecuta `test.hooks.onStart | onUpdate | onEnd | onRegister` y
 * el resultado se mapea a `verdict.metrics`, `verdict.ctx.rows`,
 * `verdict.ctx.toolsData`.
 */
const { useState, useEffect, useCallback, useMemo } = React;
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { useGlassColors, glassCardSx, NEON_COLORS } from "../../lib/ui/glass.jsx";
import { getStoredJwt } from "../../lib/auth/auth.js";
import { runTest, formatVerdict, getTool } from "../../lib/test-runner/index.mjs";
import { TestingStepDriver } from "./TestingStepDriver.jsx";
import { TestingMetricsBar } from "./TestingMetricsBar.jsx";
import { TestingTool } from "./TestingTool.jsx";

const { Box, Typography, Button, Chip, Stack, LinearProgress, Alert, Tooltip, Collapse } = MaterialUI;

const TESTING_PATHS = { testing: "/system/testing.json" };

function testRequiresAuth(test) {
    if (test?.requiresAuth === false) return false;
    if (test?.requiresAuth === true) return true;
    return (test?.steps ?? []).some((s) => s.kind === "conv");
}

function resolveTestJwt(session) {
    const token = session?.token || getStoredJwt()?.token || "";
    return String(token ?? "").trim() || undefined;
}

function hasAuthSession(session) {
    return !!resolveTestJwt(session);
}

/** Calcula la data para cada tool declarativo del test. */
function computeToolData(tool, ctx, steps, verdict) {
    const def = getTool(tool.id);
    if (!def || typeof def.compute !== "function") return null;
    try {
        return def.compute(ctx || {}, steps || [], verdict || {});
    } catch (e) {
        return { _error: e?.message ?? String(e) };
    }
}

export function TestingAccordion({ config, ns, onNeedLogin, authEnabled, session }) {
    const apiBase = config?.apiBase;
    const testingPath = config?.paths?.testing || TESTING_PATHS.testing;
    const [payload, setPayload] = useState(null);
    const [err, setErr] = useState("");
    const [running, setRunning] = useState({});
    const [results, setResults] = useState({});

    useEffect(() => {
        if (!apiBase) return;
        let cancelled = false;
        const headers = authEnabled ? (config?.auth?.jwt ? { Authorization: `Bearer ${config.auth.jwt}` } : {}) : {};
        (async () => {
            try {
                const r = await fetch(`${apiBase}${testingPath}`, { headers });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const j = await r.json();
                if (!cancelled) setPayload(j);
            } catch (e) {
                if (!cancelled) setErr(e?.message ?? String(e));
            }
        })();
        return () => { cancelled = true; };
    }, [apiBase, testingPath, authEnabled, config?.auth?.jwt]);

    const tests = payload?.tests ?? [];

    const startTest = useCallback(async (test, jwt) => {
        const id = test.id ?? `test-${tests.indexOf(test)}`;
        setRunning((s) => ({ ...s, [id]: true }));
        setResults((s) => ({ ...s, [id]: { liveSteps: [] } }));
        try {
            const verdict = await runTest(test, {
                apiBase,
                jwt,
                onStep: (r) => {
                    setResults((s) => {
                        const prev = s[id] || { liveSteps: [] };
                        return { ...s, [id]: { ...prev, liveSteps: [...prev.liveSteps, r] } };
                    });
                },
            });
            setResults((s) => ({ ...s, [id]: { ...(s[id] || {}), verdict } }));
        } finally {
            setRunning((s) => ({ ...s, [id]: false }));
        }
    }, [apiBase, tests]);

    if (err) return <Alert severity="warning" sx={{ mb: 2 }}>No se pudo cargar testing.json: {err}</Alert>;
    if (!payload) return <Box sx={{ p: 2 }}><LinearProgress /><Typography variant="caption">Cargando tests…</Typography></Box>;
    if (!tests.length) return null;

    return (
        <Box className="isa-sw-testing" sx={{ mt: 2 }}>
            <Stack spacing={2}>
                {tests.map((test) => (
                    <TestingTestCard
                        key={test.id ?? Math.random()}
                        test={test}
                        apiBase={apiBase}
                        ns={ns}
                        authEnabled={authEnabled}
                        session={session}
                        onNeedLogin={onNeedLogin}
                        startTest={startTest}
                        running={running}
                        results={results}
                    />
                ))}
            </Stack>
        </Box>
    );
}

function TestingTestCard({ test, apiBase, ns, authEnabled, session, onNeedLogin, startTest, running, results }) {
    const c = useGlassColors();
    const id = test.id ?? "?";
    const isRunning = !!running[id];
    const result = results[id];
    const verdict = result?.verdict;
    const liveSteps = result?.liveSteps ?? [];
    const [expanded, setExpanded] = useState(true);
    const needsAuth = authEnabled && testRequiresAuth(test);
    const blockedByAuth = needsAuth && !hasAuthSession(session);

    // totalSteps se calcula del array steps real del test
    const declaredSteps = test.steps ?? [];
    const totalSteps = declaredSteps.length;

    // Tools + table desde la declaración del test (normalizadas por el runner en verdict.ctx.declaracion)
    const declaracion = verdict?.ctx?.declaracion;
    const declaredTools = declaracion?.tools ?? [];
    const declaredTable = declaracion?.table ?? null;

    const toolsData = useMemo(() => {
        if (!verdict?.ctx) return [];
        return declaredTools.map((tool) => {
            const data = tool.id === "table" && declaredTable
                ? { rows: verdict.ctx.rows ?? [] }
                : computeToolData(tool, verdict.ctx, verdict.steps ?? [], verdict);
            return { tool, data, table: declaredTable };
        });
    }, [declaredTools, declaredTable, verdict]);

    const onRun = useCallback(() => {
        startTest(test, resolveTestJwt(session)).catch(() => {});
    }, [test, startTest, session]);

    const runBtn = (
        <Button
            variant="contained"
            color="secondary"
            startIcon={isRunning ? <SwIcon icon="mdi:loading" size={16} ns={ns} className="isa-sw-spin" /> : <SwIcon icon="mdi:play-circle-outline" size={16} ns={ns} />}
            onClick={onRun}
            disabled={isRunning || blockedByAuth}
            size="small"
        >
            {isRunning ? "Ejecutando…" : "Ejecutar"}
        </Button>
    );

    const cardSx = {
        ...glassCardSx(c, { accent: verdict ? (verdict.pass ? "#22c55e" : "#ef4444") : NEON_COLORS.purple, tone: "default", radius: "0.75rem", neon: true }),
        p: 0,
        overflow: "hidden",
    };

    return (
        <Box className="isa-sw-testing-row" sx={cardSx}>
            {/* Header */}
            <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${c.border}` }}>
                <SwIcon icon={test.icon || "mdi:flask-outline"} size={22} ns={ns} sx={{ color: test.accent || "#a855f7" }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {test.title ?? id}
                    </Typography>
                    {test.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {test.description}
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        size="small"
                        icon={<SwIcon icon="mdi:format-list-numbered" size={12} ns={ns} />}
                        label={`${totalSteps} step${totalSteps === 1 ? "" : "s"}`}
                        variant="outlined"
                    />
                    {test.protocol && (
                        <Chip
                            size="small"
                            variant="outlined"
                            color="default"
                            label={`protocol: ${test.protocol}`}
                            sx={{ height: 22 }}
                        />
                    )}
                    {verdict && (
                        <Chip
                            size="small"
                            color={verdict.pass ? "success" : "error"}
                            icon={<SwIcon icon={verdict.pass ? "mdi:check-decagram" : "mdi:close-octagon"} size={14} ns={ns} />}
                            label={verdict.pass ? "PASS" : "FAIL"}
                            sx={{ fontWeight: 700 }}
                        />
                    )}
                </Stack>
            </Box>

            {/* Métricas declarativas */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${c.border}` }}>
                <TestingMetricsBar
                    verdict={verdict}
                    totalSteps={totalSteps}
                    isRunning={isRunning}
                    currentStep={liveSteps.length}
                    ns={ns}
                />
            </Box>

            {/* Progress bar en vivo */}
            {isRunning && (
                <Box sx={{ px: 2, pt: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={totalSteps > 0 ? (liveSteps.length / totalSteps) * 100 : 0}
                        sx={{ height: 4, borderRadius: 2 }}
                    />
                </Box>
            )}

            {/* Acciones */}
            <Stack direction="row" spacing={1} sx={{ p: 2, borderBottom: `1px solid ${c.border}`, flexWrap: "wrap" }}>
                {blockedByAuth ? (
                    <Tooltip title="Inicie sesión para ejecutar este test" arrow>
                        <span>{runBtn}</span>
                    </Tooltip>
                ) : (
                    runBtn
                )}
                {needsAuth && blockedByAuth && (
                    <Button variant="outlined" onClick={() => onNeedLogin?.("Este test requiere JWT (POST /conversacion).")} size="small" disabled={isRunning}>
                        Iniciar sesión
                    </Button>
                )}
                <Button
                    variant="text"
                    size="small"
                    onClick={() => setExpanded((v) => !v)}
                    startIcon={<SwIcon icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"} size={14} ns={ns} />}
                >
                    {expanded ? "Ocultar detalle" : "Mostrar detalle"}
                </Button>
            </Stack>

            {blockedByAuth && (
                <Alert severity="info" sx={{ mx: 2, my: 1, py: 0 }}>
                    Requiere sesión activa — use <strong>Iniciar sesión</strong> en la barra superior o el botón junto a Ejecutar.
                </Alert>
            )}

            <Collapse in={expanded}>
                {/* Steps */}
                {liveSteps.length > 0 && (
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <SwIcon icon="mdi:format-list-checks" size={16} ns={ns} aria-hidden />
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                                Pasos ejecutados
                            </Typography>
                            <Chip size="small" variant="outlined" label={`${liveSteps.length}/${totalSteps}`} sx={{ height: 18, fontSize: "0.65rem" }} />
                        </Stack>
                        <Stack spacing={1}>
                            {liveSteps.map((s) => (
                                <TestingStepDriver key={s.index} step={s} ns={ns} />
                            ))}
                        </Stack>
                    </Box>
                )}

                {/* Tools declarativas (timeline, histogram, table) */}
                {verdict && toolsData.length > 0 && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Stack spacing={2}>
                            {toolsData.map(({ tool, data, table }, i) => {
                                const effective = tool.id === "table" && table ? { ...tool, table } : tool;
                                return (
                                    <Box
                                        key={`${tool.id}-${i}`}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1,
                                            background: c.cardBg,
                                            border: `1px solid ${c.border}`,
                                        }}
                                    >
                                        <TestingTool tool={effective} data={data} ns={ns} />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                )}

                {/* Verdict alert */}
                {verdict && (
                    <Box sx={{ px: 2, pb: 2 }}>
                        <Alert
                            severity={verdict.pass ? "success" : "error"}
                            icon={<SwIcon icon={verdict.pass ? "mdi:check-decagram" : "mdi:close-octagon"} size={20} ns={ns} />}
                            sx={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}
                        >
                            {formatVerdict(verdict, { verbose: false, color: false })}
                        </Alert>
                    </Box>
                )}
            </Collapse>
        </Box>
    );
}