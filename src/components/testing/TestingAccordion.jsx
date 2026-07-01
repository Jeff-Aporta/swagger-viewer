const { useState, useEffect, useCallback, useRef, useMemo } = React;
const MaterialUI = globalThis.MaterialUI;
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { getStoredJwt } from "../../lib/auth/auth.js";
import { runTest, formatVerdict } from "../../lib/test-runner/index.mjs";

const { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Button, Chip, Stack, LinearProgress, Alert, Tooltip } = MaterialUI;

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

/**
 * Acordeón de testing para el visor IS-Swagger.
 * Carga GET /system/testing.json y renderiza accordions por test (tag "testing").
 * Click "Ejecutar" → runTest() → onStep incremental + verdict final.
 */
export function TestingAccordion({ config, ns, onNeedLogin, authEnabled, session }) {
    const apiBase = config?.apiBase;
    const testingPath = config?.paths?.testing || TESTING_PATHS.testing;
    const [payload, setPayload] = useState(null);
    const [err, setErr] = useState("");
    const [running, setRunning] = useState({});
    const [results, setResults] = useState({});
    const liveSteps = useRef({});

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
        liveSteps.current[id] = [];
        setResults((s) => ({ ...s, [id]: null }));
        try {
            const verdict = await runTest(test, {
                apiBase,
                jwt,
                onStep: (r) => {
                    liveSteps.current[id] = [...(liveSteps.current[id] ?? []), r];
                    setResults((s) => ({ ...s, [id]: { ...(s[id] ?? {}), liveSteps: liveSteps.current[id] } }));
                },
            });
            setResults((s) => ({ ...s, [id]: { ...(s[id] ?? {}), verdict } }));
        } finally {
            setRunning((s) => ({ ...s, [id]: false }));
        }
    }, [apiBase, tests]);

    if (err) return <Alert severity="warning" sx={{ mb: 2 }}>No se pudo cargar testing.json: {err}</Alert>;
    if (!payload) return <Box sx={{ p: 2 }}><LinearProgress /><Typography variant="caption">Cargando tests…</Typography></Box>;
    if (!tests.length) return null;

    return (
        <Box className="isa-sw-testing" sx={{ mt: 2 }}>
            {tests.map((test) => (
                <TestingTestAccordion
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
        </Box>
    );
}

function TestingTestAccordion({ test, apiBase, ns, authEnabled, session, onNeedLogin, startTest, running, results }) {
    const id = test.id ?? "?";
    const isRunning = !!running[id];
    const result = results[id];
    const verdict = result?.verdict;
    const liveSteps = result?.liveSteps ?? [];
    const [expanded, setExpanded] = useState(false);
    const needsAuth = authEnabled && testRequiresAuth(test);
    const blockedByAuth = needsAuth && !hasAuthSession(session);

    const subtitle = useMemo(() => {
        const n = (test.steps ?? []).length;
        return `${n} step${n === 1 ? "" : "s"}`;
    }, [test.steps]);

    const onRun = useCallback(() => {
        startTest(test, resolveTestJwt(session)).catch(() => {});
    }, [test, startTest, session]);

    const runBtn = (
        <Button
            variant="contained"
            color="secondary"
            startIcon={isRunning ? null : <SwIcon icon="mdi:play-circle-outline" ns={ns} />}
            onClick={onRun}
            disabled={isRunning || blockedByAuth}
            size="small"
        >
            {isRunning ? "Ejecutando…" : "Ejecutar"}
        </Button>
    );

    return (
        <Accordion
            expanded={expanded}
            onChange={(_e, v) => setExpanded(!!v)}
            className="isa-sw-testing-row"
            sx={{
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: 1,
                mb: 1,
                background: "rgba(168, 85, 247, 0.04)",
            }}
        >
            <AccordionSummary expandIcon={<SwIcon icon="mdi:chevron-down" ns={ns} />}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
                    <SwIcon icon="mdi:flask-outline" ns={ns} sx={{ color: "rgb(168, 85, 247)" }} />
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
                    <Chip size="small" label={subtitle} sx={{ ml: 1 }} />
                    {verdict && (
                        <Chip
                            size="small"
                            label={verdict.pass ? "PASS" : "FAIL"}
                            color={verdict.pass ? "success" : "error"}
                            sx={{ ml: 1 }}
                        />
                    )}
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {blockedByAuth ? (
                            <Tooltip title="Inicie sesión para ejecutar este test" arrow>
                                <span>{runBtn}</span>
                            </Tooltip>
                        ) : runBtn}
                        {needsAuth && blockedByAuth ? (
                            <Button variant="outlined" onClick={() => onNeedLogin?.("Este test requiere JWT (POST /conversacion).")} size="small" disabled={isRunning}>
                                Iniciar sesión
                            </Button>
                        ) : null}
                    </Stack>
                    {blockedByAuth ? (
                        <Alert severity="info" sx={{ py: 0 }}>
                            Requiere sesión activa — use <strong>Iniciar sesión</strong> en la barra superior o el botón junto a Ejecutar.
                        </Alert>
                    ) : null}
                    {isRunning && <LinearProgress />}
                    {liveSteps.length > 0 && (
                        <Box>
                            <Typography variant="overline" color="text.secondary">Pasos ({liveSteps.length})</Typography>
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                {liveSteps.map((s) => (
                                    <TestingStepRow key={s.index} step={s} ns={ns} />
                                ))}
                            </Stack>
                        </Box>
                    )}
                    {verdict && (
                        <Alert severity={verdict.pass ? "success" : "error"} sx={{ whiteSpace: "pre-wrap" }}>
                            {formatVerdict(verdict, { verbose: false, color: false })}
                        </Alert>
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}

function TestingStepRow({ step, ns }) {
    const tag = step.ok ? "✓" : "✗";
    const color = step.ok ? "success" : "error";
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ fontFamily: "monospace", fontSize: 12 }}>
            <Chip size="small" label={`${step.index}`} variant="outlined" />
            <Chip size="small" color={color} label={tag} sx={{ minWidth: 28 }} />
            <Chip size="small" label={step.kind} variant="outlined" />
            {step.iconversacion != null && <Chip size="small" label={`iconv=${step.iconversacion}`} variant="outlined" />}
            {step.titulo && <Typography variant="caption" sx={{ ml: 1 }}>titulo: {step.titulo}</Typography>}
            {step.titleChange && (
                <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                    Δ {step.titleChange.from ?? "(vacío)"} → {step.titleChange.to}
                </Typography>
            )}
            {step.error && <Typography variant="caption" color="error.main">error: {step.error}</Typography>}
        </Stack>
    );
}