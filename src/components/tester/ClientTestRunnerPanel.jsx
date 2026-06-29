// ClientTestRunnerPanel.jsx — Panel de testing agnóstico para tests procedurales.
//
// Lee `steps` directamente desde la definición del test (no desde un registro global).
// Cada test que pasa el Viewer es un objeto `{ id, title, description, docs, steps: [...] }`.
// Muestra los steps, botón "Ejecutar", stream SSE palabra a palabra, summary, judge verdict.

import { processDetailSugars } from "../../lib/ui/sse-sugars.js";
import { JsonDetailDialog } from "../dialogs/JsonDetailDialog.jsx";
import { runStepsAsStream } from "../../lib/test/client-procedure-renderer.js";
import { renderMarkdown } from "../../lib/ui/markdown.js";
import { formatBytes } from "../../lib/http/format-bytes.js";
import { useServerBase } from "../../context/ServerBaseContext.jsx";
import { getStoredJwt } from "../../lib/auth/auth.js";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";

const { useState, useEffect, useMemo, useRef } = React;
const { Box, Button, Typography, Chip, CircularProgress, Alert } = MaterialUI;

/** Vista del JSON de steps embellecido y crudo a la vez. */
function ProtocolSteps({ steps }) {
    const [tab, setTab] = useState("visual");
    return (
        <Box>
            <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                <Button size="small" variant={tab === "visual" ? "contained" : "outlined"} onClick={() => setTab("visual")} startIcon={<SwIcon icon="mdi:format-list-bulleted-square" size={14} ns="ISA" />}>Visual</Button>
                <Button size="small" variant={tab === "raw" ? "contained" : "outlined"} onClick={() => setTab("raw")} startIcon={<SwIcon icon="mdi:code-json" size={14} ns="ISA" />}>JSON</Button>
            </Box>
            {tab === "visual" ? (
                <Box component="ol" className="isa-sw-tester-steps" sx={{ pl: 2.5, m: 0 }}>
                    {(steps || []).map((step, i) => {
                        const kind = step.kind || "auto";
                        const tone = {
                            conv: { c: "success.main", icon: "mdi:message-text-outline" },
                            http: { c: "info.main", icon: "mdi:earth" },
                            script: { c: "warning.main", icon: "mdi:language-javascript" },
                            raw: { c: "secondary.main", icon: "mdi:api" },
                            auto: { c: "text.secondary", icon: "mdi:auto-fix" },
                        }[kind] || { c: "text.secondary", icon: "mdi:help-circle-outline" };
                        return (
                            <li key={i} style={{ marginBottom: 6 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>#{i + 1}</Typography>
                                    <SwIcon icon={tone.icon} size={14} ns="ISA" style={{ color: `var(--mui-palette-${tone.c.replace(".main", "")}-main)` }} />
                                    <Chip label={kind} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                                    <Typography variant="body2" sx={{ flex: 1 }}>{step.description || `Step ${i + 1}`}</Typography>
                                </Box>
                                {step.prompt ? <Typography component="pre" variant="caption" sx={{ ml: 5, mt: 0.5, p: 1, bgcolor: "action.hover", borderRadius: 0.5, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" }}>{truncate(step.prompt, 240)}</Typography> : null}
                                {step.run ? <Typography component="pre" variant="caption" sx={{ ml: 5, mt: 0.5, p: 1, bgcolor: "action.hover", borderRadius: 0.5, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" }}>{truncate(step.run, 240)}</Typography> : null}
                            </li>
                        );
                    })}
                </Box>
            ) : (
                <Box component="pre" className="isa-sw-tester-rawjson" sx={{ m: 0, p: 1.25, bgcolor: "action.hover", borderRadius: 1, fontSize: "0.75rem", overflow: "auto", maxHeight: 360 }}>{JSON.stringify(steps || [], null, 2)}</Box>
            )}
        </Box>
    );
}

function truncate(s, max) {
    s = String(s || "");
    if (s.length <= max) return s;
    return s.slice(0, max - 12) + "\n[...]";
}

/** Vista incremental de eventos SSE. */
function TesterStream({ events }) {
    const containerRef = useRef(null);
    const lastCountRef = useRef(0);
    const bufferRef = useRef(new Map());
    const detailRef = useRef(new Map());
    const [activeDetail, setActiveDetail] = useState(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const next = Array.isArray(events) ? events : [];
        if (next.length === lastCountRef.current) return;
        for (let i = lastCountRef.current; i < next.length; i++) {
            const ev = next[i];
            if (!ev) continue;
            const t = ev.type || "message";
            if (t === "context" || t === "step" || t === "summary" || t === "error" || t === "trace") {
                if (typeof ev.md !== "string" || !ev.md.trim()) continue;
                const block = document.createElement("div");
                block.className = "isa-sw-tryit-sse__event";
                block.dataset.sseType = t;
                const out = processDetailSugars(renderMarkdown(ev.md));
                block.innerHTML = out.html;
                for (const d of out.details) detailRef.current.set(d.id, d);
                if (root.lastChild) {
                    const sep = document.createElement("hr");
                    sep.className = "isa-sw-tryit-sse__sep";
                    root.appendChild(sep);
                }
                root.appendChild(block);
            } else if (t === "delta") {
                const stepId = ev.stepId || "_anon";
                let buf = bufferRef.current.get(stepId);
                if (!buf) {
                    buf = document.createElement("div");
                    buf.className = "isa-sw-tryit-sse__event isa-sw-tryit-sse__delta";
                    buf.dataset.sseType = "delta";
                    buf.dataset.stepId = stepId;
                    buf.style.whiteSpace = "pre-wrap";
                    buf.style.fontFamily = "ui-monospace, monospace";
                    buf.style.fontSize = "0.85rem";
                    buf.style.padding = "6px 10px";
                    buf.style.background = "rgba(0,200,120,0.08)";
                    buf.style.borderRadius = "4px";
                    buf.style.margin = "4px 0";
                    root.appendChild(buf);
                    bufferRef.current.set(stepId, buf);
                }
                buf.appendChild(document.createTextNode(ev.chunk || ""));
            } else if (t === "tick") {
                const statusId = "__status__";
                let status = bufferRef.current.get(statusId);
                if (!status) {
                    status = document.createElement("div");
                    status.className = "isa-sw-tryit-sse__event isa-sw-tryit-sse__status";
                    status.dataset.sseType = "tick";
                    status.style.padding = "2px 8px";
                    status.style.fontSize = "0.75rem";
                    status.style.color = "#888";
                    status.style.fontStyle = "italic";
                    root.appendChild(status);
                    bufferRef.current.set(statusId, status);
                }
                status.textContent = `⟳ stream ${ev.bytesReceived}B · ${(ev.elapsedMs / 1000).toFixed(1)}s`;
            }
        }
        lastCountRef.current = next.length;
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [events]);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return undefined;
        const handler = (e) => {
            const t = e.target instanceof Element ? e.target.closest("[data-isa-detail-id]") : null;
            if (!t) return;
            const id = t.getAttribute("data-isa-detail-id");
            const data = detailRef.current.get(id);
            if (!data) return;
            e.preventDefault();
            const block = t.closest("[data-sse-type]");
            const blockLabel = block?.dataset?.sseType || "Detalle";
            setActiveDetail({ id, label: data.label, content: data.content, title: `${blockLabel}: ${data.label}` });
        };
        const close = (e) => { if (e.key === "Escape") setActiveDetail(null); };
        root.addEventListener("click", handler);
        window.addEventListener("keydown", close);
        return () => {
            root.removeEventListener("click", handler);
            window.removeEventListener("keydown", close);
        };
    }, []);

    return (
        <Box className="isa-sw-doc isa-sw-tryit-sse" sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: "action.hover", overflow: "auto", maxHeight: "32rem" }}>
            <div ref={containerRef} />
            <JsonDetailDialog
                open={!!activeDetail}
                onClose={() => setActiveDetail(null)}
                title={activeDetail?.title}
                label={activeDetail?.label}
                content={activeDetail?.content}
            />
        </Box>
    );
}

/**
 * Tester principal.
 * @param {object} props
 * @param {object} props.test          - Definición del test: { id, title, description, docs, steps }.
 * @param {string} props.docMd         - Doc markdown opcional (sobrescribe `test.docs`).
 * @param {boolean} props.authEnabled  - Si la API requiere JWT.
 * @param {Function} props.onNeedLogin - Notifica al visor que debe abrir el diálogo de login.
 * @param {string} [props.ns="ISA"]    - Prefijo para icons.
 */
export function ClientTestRunnerPanel({ test, docMd, authEnabled, onNeedLogin, ns = "ISA" }) {
    const { serverBase } = useServerBase();
    const steps = useMemo(() => Array.isArray(test?.steps) ? test.steps : [], [test?.steps]);
    const [busy, setBusy] = useState(false);
    const [events, setEvents] = useState([]);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState("");
    const [tab, setTab] = useState("protocol"); // protocol | run
    const eventTickRef = useRef(0);
    // serverBaseCtx.serverBase ya incluye /api (es el apiBase del config),
    // así que NO concatenamos /api otra vez para evitar /api/api/…
    // Si llega vacío (caso fallback local), usamos DEFAULT_BASEURL = "/api".
    const baseUrl = (serverBase || "").replace(/\/+$/, "") || "/api";
    const baseUrlHasApi = /\/api$/i.test(baseUrl);
    const finalBaseUrl = baseUrlHasApi ? baseUrl : `${baseUrl}/api`;

    const finalDocs = docMd || test?.docs || "";

    async function run() {
        if (!steps.length) return;
        if (authEnabled && !getStoredJwt()?.token) {
            onNeedLogin?.("Este test requiere JWT. Inicia sesión para ejecutarlo.");
            return;
        }
        setBusy(true);
        setErr("");
        setResult(null);
        setEvents([]);
        eventTickRef.current = 0;
        const started = performance.now();
        const list = [];
        function push(ev) {
            list.push(ev);
            eventTickRef.current++;
            if (eventTickRef.current % 4 === 0 || ev.type === "summary" || ev.type === "error") {
                setEvents([...list]);
            } else {
                setEvents(list);
            }
        }
        try {
            const r = await runStepsAsStream({
                steps,
                baseUrl: finalBaseUrl,
                getJwt: () => getStoredJwt()?.token,
                emit: (ev) => push(ev),
                session: test?.id || test?.title || "client-test",
            });
            const elapsed = Math.round(performance.now() - started);
            setResult({ ok: r.ok, elapsed, verdict: r.verdict, error: r.error, total: steps.length });
            setEvents([...list]);
            setTab("run");
        } catch (e) {
            setErr(e?.message || String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Box className="isa-sw-tester" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box className="isa-sw-tester-header" sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: "primary.main", color: "primary.contrastText" }}>
                <SwIcon icon="mdi:test-tube" size={26} ns={ns} style={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{test?.title || "Tester"}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        Tests agnósticos. <strong>100% en el cliente</strong> — el server solo provee la API productiva.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={run}
                    disabled={busy || !steps.length}
                    startIcon={busy ? null : <SwIcon icon="mdi:play" size={18} ns={ns} />}
                    sx={{ flexShrink: 0, fontWeight: 700 }}
                >
                    {busy ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Ejecutar test"}
                </Button>
            </Box>

            {err ? <Alert severity="error" onClose={() => setErr("")}>{err}</Alert> : null}

            <Box>
                <Box sx={{ display: "flex", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
                    <Button size="small" variant={tab === "protocol" ? "contained" : "outlined"} onClick={() => setTab("protocol")} startIcon={<SwIcon icon="mdi:clipboard-text-outline" size={14} ns={ns} />}>Pasos <Chip size="small" label={steps.length} sx={{ ml: 0.5, height: 18 }} /></Button>
                    <Button size="small" variant={tab === "run" ? "contained" : "outlined"} onClick={() => setTab("run")} startIcon={<SwIcon icon="mdi:run-fast" size={14} ns={ns} />}>Run</Button>
                    {finalDocs ? <Button size="small" variant={tab === "doc" ? "contained" : "outlined"} onClick={() => setTab("doc")} startIcon={<SwIcon icon="mdi:book-open-page-variant" size={14} ns={ns} />}>Doc</Button> : null}
                </Box>
                {tab === "protocol" ? <ProtocolSteps steps={steps} /> : null}
                {tab === "run" ? (
                    <Box>
                        {result ? (
                            <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                <Chip
                                    icon={<SwIcon icon={result.ok ? "mdi:check-circle-outline" : "mdi:close-circle-outline"} size={14} ns={ns} />}
                                    label={result.ok ? "PASS" : "FAIL"}
                                    color={result.ok ? "success" : "error"}
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {result.elapsed} ms · {formatBytes((result.verdict?.totalMessages || 0) * 64)} · {result.total} steps
                                </Typography>
                                {result.verdict ? (
                                    <Box component="pre" sx={{ ml: "auto", p: 0.75, bgcolor: "action.hover", borderRadius: 0.5, fontSize: "0.7rem", maxWidth: 360, maxHeight: 80, overflow: "auto", m: 0 }}>{JSON.stringify(result.verdict, null, 2)}</Box>
                                ) : null}
                            </Box>
                        ) : null}
                        <TesterStream events={events} />
                    </Box>
                ) : null}
                {tab === "doc" && finalDocs ? <Box className="isa-sw-doc isa-sw-op-doc" dangerouslySetInnerHTML={{ __html: renderMarkdown(finalDocs) }} sx={{ p: 1.5, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }} /> : null}
            </Box>
        </Box>
    );
}
