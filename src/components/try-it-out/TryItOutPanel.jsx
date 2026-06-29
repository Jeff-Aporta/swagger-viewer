import { ParametersTable, pathParamsOnly } from "./ParametersTable.jsx";
import { RequestBodySection } from "./RequestBodySection.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { QueryFiltersPanel } from "./QueryFiltersPanel.jsx";
import { IssListFilterField, isIssListFilterParam } from "../filters/IssListFilterField.jsx";
import { ISS_LIST_FILTER_EXT, hiddenOwnerQueryParamNames, splitOwnerFromFilterQuery } from "../../lib/filter/iss-list-filter.js";
import { jsonPretty, operationRequiresBearer, resolveServerUrl } from "../../lib/openapi/openapi.js";
import { defaultTryItBodyText, opUsesRequestBody, resolveTryItBodyExample, shouldShowTryItBody } from "../../lib/openapi/tryit-body.js";
import { getStoredJwt } from "../../lib/auth/auth.js";
import { joinApiUrl } from "../../lib/lookup/server-base.js";
import { fetchSseStream, extractEnvelopeError, authHeaders } from "../../lib/http/api-fetch.js";
import { formatHttpError, extractApiError } from "../../lib/http/http-error.js";
import { formatBytes } from "../../lib/http/format-bytes.js";
import { createSseIncrementalParser, formatUnitTestSse, isEventStreamResponse, parseSseDataLines } from "../../lib/http/sse-parse.js";
import { buildTryItConfirmCopy, needsTryItConfirm } from "../../lib/openapi/tryit-confirm.js";
import { defaultParamEnumValue } from "../../lib/openapi/param-enum.js";
import { resolveTryItAttachments, mergeAttachmentsIntoJsonBody, buildMultipartBody, hasTryItAttachments, emptyAttachmentsState } from "../../lib/openapi/tryit-attachments.js";
import { readOpParamFromUrl, subscribeOpParamsUrl } from "../../lib/nav/operation-params-url.js";
import { clipboardImageDataUrl } from "../../lib/media/file-data-url.js";
import { renderMarkdown } from "../../lib/ui/markdown.js";
import { useServerBase } from "../../context/ServerBaseContext.jsx";
import { SwIcon } from "../../lib/ui/sw-icon.jsx";
import { DangerousOpConfirmDialog } from "../dialogs/DangerousOpConfirmDialog.jsx";
import { HttpErrorAlert } from "./HttpErrorAlert.jsx";
import { processDetailSugars } from "../../lib/ui/sse-sugars.js";
import { JsonDetailDialog } from "../dialogs/JsonDetailDialog.jsx";
import { runStepsAsStream } from "../../lib/test/client-procedure-renderer.js";

const { useState, useMemo, useEffect, useRef } = React;
const { Box, Button, Typography, CircularProgress, Chip, TextField, Tooltip, IconButton } = MaterialUI;

const METHOD_COLORS = { get: "info", post: "success", put: "warning", patch: "secondary", delete: "error" };
const CONFIRM_BTN_COLOR = { delete: "error", put: "warning", patch: "secondary", post: "success" };

/**
 * Render append-only de eventos SSE: cada `events[i].md` se acumula en el DOM
 * de manera incremental para que el efecto stream sea visible al ojo humano.
 * No re-renderiza los bloques anteriores cuando llega uno nuevo.
 */
function SseStreamView({ events, scrollRef }) {
    const containerRef = useRef(null);
    const lastCountRef = useRef(0);
    // Map stepId → bloque por step donde acumulamos los chunks (delta → texto plano).
    const stepBuffersRef = useRef(new Map());
    // Detalles por evento SSE (id → { label, content }) acumulados para alimentar el modal.
    const detailsMapRef = useRef(new Map());
    const [activeDetail, setActiveDetail] = useState(null); // { id, label, content, title }
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const next = Array.isArray(events) ? events : [];
        if (next.length === lastCountRef.current) return;
        // Append sólo los eventos nuevos (no reemplaza el HTML existente).
        for (let i = lastCountRef.current; i < next.length; i++) {
            const ev = next[i];
            if (!ev) continue;
            const evType = ev.type || "message";
            // Render markdown para context/step/summary/error — bloques completos con separador.
            if (evType === "context" || evType === "step" || evType === "summary" || evType === "error") {
                if (typeof ev.md !== "string" || !ev.md.trim()) continue;
                const block = document.createElement("div");
                block.className = "isa-sw-tryit-sse__event";
                block.dataset.sseType = evType;
                const { html, details } = processDetailSugars(renderMarkdown(ev.md));
                block.innerHTML = html;
                // Registrar los details asociados a este bloque.
                for (const d of details) detailsMapRef.current.set(d.id, d);
                if (root.lastChild) {
                    const sep = document.createElement("hr");
                    sep.className = "isa-sw-tryit-sse__sep";
                    root.appendChild(sep);
                }
                root.appendChild(block);
            } else if (evType === "delta") {
                // Append solo: cada delta se acumula en el bloque del step, sin recargar.
                const stepId = ev.stepId || "_anon";
                let buf = stepBuffersRef.current.get(stepId);
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
                    if (root.lastChild) {
                        const sep = document.createElement("hr");
                        sep.className = "isa-sw-tryit-sse__sep";
                        root.appendChild(sep);
                    }
                    root.appendChild(buf);
                    stepBuffersRef.current.set(stepId, buf);
                }
                buf.appendChild(document.createTextNode(ev.chunk || ""));
            } else if (evType === "tick") {
                // Tick: actualizamos un mini-status con bytes/tiempo restantes.
                const statusId = "__status__";
                let status = stepBuffersRef.current.get(statusId);
                if (!status) {
                    status = document.createElement("div");
                    status.className = "isa-sw-tryit-sse__event isa-sw-tryit-sse__status";
                    status.dataset.sseType = "tick";
                    status.style.padding = "2px 8px";
                    status.style.fontSize = "0.75rem";
                    status.style.color = "#888";
                    status.style.fontStyle = "italic";
                    root.appendChild(status);
                    stepBuffersRef.current.set(statusId, status);
                }
                status.textContent = `⟳ stream ${ev.bytesReceived}B · ${(ev.elapsedMs / 1000).toFixed(1)}s`;
            }
        }
        lastCountRef.current = next.length;
        if (scrollRef?.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, scrollRef]);
    // Click delegado sobre los botones `.isa-sw-detail-btn` que aparecen en cualquier bloque.
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return undefined;
        const handler = (e) => {
            const target = e.target instanceof Element ? e.target.closest("[data-isa-detail-id]") : null;
            if (!target) return;
            const id = target.getAttribute("data-isa-detail-id");
            const data = detailsMapRef.current.get(id);
            if (!data) return;
            e.preventDefault();
            // Resolvemos el label del bloque padre como título para dar contexto.
            const block = target.closest("[data-sse-type]");
            const blockLabel = block?.dataset?.sseType || "Detalle";
            setActiveDetail({ id, label: data.label, content: data.content, title: `${blockLabel}: ${data.label}` });
        };
        const closeOnStream = (e) => {
            if (e.key === "Escape") setActiveDetail(null);
        };
        root.addEventListener("click", handler);
        window.addEventListener("keydown", closeOnStream);
        return () => {
            root.removeEventListener("click", handler);
            window.removeEventListener("keydown", closeOnStream);
        };
    }, []);
    return (
        <Box
            ref={scrollRef}
            className="isa-sw-doc isa-sw-tryit-sse"
            sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: "action.hover", overflow: "auto", maxHeight: "28rem" }}
        >
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

function applyPathParams(path, paramValues) {
  let url = path;
  for (const [k, v] of Object.entries(paramValues)) {
    url = url.replace(`{${k}}`, encodeURIComponent(v || ""));
  }
  return url;
}

function textByteLength(text) {
  if (!text) return 0;
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
  return String(text).length;
}

function buildTryItOutUrl({ op, values, serverBase, spec, packQueryQ, queryParams }) {
  const server = serverBase || resolveServerUrl(spec) || (typeof location !== "undefined" ? location.origin : "");
  let url = joinApiUrl(server, applyPathParams(op.path, values));
  const qs = new URLSearchParams();
  if (packQueryQ) {
    const qVal = values.q;
    if (qVal != null && String(qVal).length) qs.set("q", String(qVal));
  } else {
    const hiddenOwner = hiddenOwnerQueryParamNames(queryParams);
    for (const p of queryParams) {
      if (hiddenOwner.has(p.name)) continue;
      if (isIssListFilterParam(p)) {
        const raw = values[p.name];
        if (raw != null && String(raw).length) {
          const { filterQuery, owner } = splitOwnerFromFilterQuery(String(raw), p[ISS_LIST_FILTER_EXT] || {});
          if (filterQuery) qs.set(p.name, filterQuery);
          for (const [k, v] of Object.entries(owner)) {
            if (v) qs.set(k, v);
          }
        }
        continue;
      }
      const v = values[p.name];
      if (v != null && String(v).length) qs.set(p.name, v);
    }
  }
  const q = qs.toString();
  if (q) url += (url.includes("?") ? "&" : "?") + q;
  return url;
}

export function TryItOutPanel({ op, spec, lookupIndex, catalogDocKeys = null, expandId = "", onNeedLogin, authEnabled, ns = "ISA" }) {
  const params = op.parameters || [];
  const queryParams = params.filter((p) => p.in === "query");
  const queryQExt = op["x-iss-query-q"];
  const packQueryQ = !!queryQExt;
  const pathParams = pathParamsOnly(params);
  const headerParams = params.filter((p) => p.in === "header");
  const hiddenOwner = hiddenOwnerQueryParamNames(queryParams);
  const visibleQueryParams = queryParams.filter((p) => !hiddenOwner.has(p.name));
  const extraParams = packQueryQ ? headerParams : [...visibleQueryParams, ...headerParams];

  const needsBearer = authEnabled && operationRequiresBearer(op, spec);
  const needsConfirm = needsTryItConfirm(op, spec, authEnabled);
  const specExample = resolveTryItBodyExample(op);
  const defaultBody = useMemo(() => defaultTryItBodyText(op), [op.path, op.method, op.requestBody]);
  const attachConfig = useMemo(() => resolveTryItAttachments(op, spec), [op, spec]);
  const { serverBase } = useServerBase();
  const [values, setValues] = useState({});
  const [body, setBody] = useState(defaultBody);
  const [attachments, setAttachments] = useState(emptyAttachmentsState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [apiErr, setApiErr] = useState("");
  const sseScrollRef = useRef(null);
  useEffect(() => {
    if (!result?.sseMarkdown) return;
    const el = sseScrollRef.current;
    if (!el) return;
    // seguir el stream mientras streamea, y al final bajar al resumen
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [result?.sseMarkdown]);

  const previewUrl = useMemo(
    () => buildTryItOutUrl({ op, values, serverBase, spec, packQueryQ, queryParams }),
    [op, values, serverBase, spec, packQueryQ, queryParams],
  );
  const previewLabel = `${op.method.toUpperCase()} ${previewUrl}`;
  const confirmCopy = useMemo(() => {
    if (!needsConfirm) return null;
    return buildTryItConfirmCopy(op, spec, { session: getStoredJwt(), values, url: previewUrl });
  }, [needsConfirm, op, spec, previewUrl, confirmOpen, values]);

  useEffect(() => {
    const init = {};
    for (const p of op.parameters || []) {
      if (p.in !== "path") continue;
      const persisted = expandId ? readOpParamFromUrl(expandId, p.name) : "";
      if (persisted) {
        init[p.name] = persisted;
        continue;
      }
      const ex = p.schema?.example ?? p.example;
      if (ex != null && String(ex).length) init[p.name] = String(ex);
      else if (p.required) {
        const def = defaultParamEnumValue(p, spec, op.path, catalogDocKeys);
        if (def) init[p.name] = def;
      }
    }
    setBody(defaultBody);
    setValues(init);
    setAttachments(emptyAttachmentsState());
    setConfirmOpen(false);
    setResult(null);
    setErr("");
    setApiErr("");
  }, [op.path, op.method, defaultBody, op.parameters, spec, catalogDocKeys, expandId]);

  useEffect(() => {
    if (!expandId) return undefined;
    return subscribeOpParamsUrl(() => {
      setValues((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const p of op.parameters || []) {
          if (p.in !== "path") continue;
          const want = readOpParamFromUrl(expandId, p.name);
          if (want !== next[p.name]) {
            next[p.name] = want;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
  }, [expandId, op.parameters]);

  useEffect(() => {
    const imgCfg = attachConfig?.images;
    if (!imgCfg?.clipboard || busy) return;
    async function onPaste(e) {
      const dataUrl = await clipboardImageDataUrl(e);
      if (!dataUrl) return;
      e.preventDefault();
      setAttachments((prev) => {
        const images = prev.images || [];
        if (images.length >= (imgCfg.max || 10)) return prev;
        return { ...prev, images: [...images, { id: `clip-${Date.now()}`, name: "portapapeles", dataUrl, kind: "image" }] };
      });
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [attachConfig, busy]);

  function onParamChange(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  function requestExecute() {
    if (needsBearer && !getStoredJwt()?.token) {
      onNeedLogin?.("Este endpoint requiere JWT. Inicia sesión para ejecutar.");
      return;
    }
    if (needsConfirm) {
      setConfirmOpen(true);
      return;
    }
    execute();
  }

  async function execute() {
    if (needsBearer && !getStoredJwt()?.token) {
      onNeedLogin?.("Este endpoint requiere JWT. Inicia sesión para ejecutar.");
      return;
    }
    // Camino cliente: el test vive como `{ steps: [...] }` en `op._clientTest`.
    // Cada test trae sus propios steps declarativos; no hay registro/protocolo hardcoded.
    const clientTest = op?._clientTest;
    if (clientTest && Array.isArray(clientTest.steps) && clientTest.steps.length) {
        await runClientTest({ test: clientTest });
        return;
    }
    setConfirmOpen(false);
    setBusy(true);
    await executeServerPath();

    async function runClientTest({ test }) {
        setConfirmOpen(false);
        setBusy(true);
        setErr("");
        setApiErr("");
        setResult(null);
        const events = [];
        const started = performance.now();
        function feed(ev) {
            events.push(ev);
            const md = formatUnitTestSse(events).markdown;
            const summary = events.find((e) => e.type === "summary");
            const elapsed = Math.round(performance.now() - started);
            const bytesIn = events.reduce((acc, e) => acc + (e.chunk?.length || (e.md?.length || 0)), 0);
            setResult({
                status: 200,
                statusText: "CLIENT",
                elapsed,
                bytesIn,
                body: md || "",
                sseMarkdown: md,
                sseEvents: [...events],
                sseOk: summary?.ok ?? null,
                sseStreaming: !summary,
            });
        }
        try {
            const r = await runStepsAsStream({
                steps: test.steps,
                baseUrl: `${(serverBase || "").replace(/\/+$/, "")}/api`,
                getJwt: () => getStoredJwt()?.token,
                emit: (ev) => feed(ev),
                session: test.id || test.title || "client-test",
            });
            if (!r.ok) setApiErr("El test cliente reportó fallos. Revisa los pasos marcados con ❌.");
            setResult((prev) => prev ? { ...prev, sseStreaming: false } : prev);
        } catch (e) {
            setErr(e?.message || String(e));
        } finally {
            setBusy(false);
        }
    }
    setErr("");
    setApiErr("");
    setResult(null);
    await executeServerPath();

    async function executeServerPath() {
    try {
      const url = previewUrl;
      const headers = {};
      for (const p of headerParams) {
        const v = values[p.name];
        if (v) headers[p.name] = v;
      }
      const init = { method: op.method.toUpperCase(), headers };
      if (opUsesRequestBody(op.method)) {
        const cfg = attachConfig;
        const hasFiles = !!(attachments?.images?.length || attachments?.audios?.length || attachments?.files?.length);
        if (cfg?.mode === "multipart" && hasTryItAttachments(cfg)) {
          init.body = buildMultipartBody(attachments, cfg, body);
        } else {
          headers["Content-Type"] = "application/json";
          let rawBody = String(body ?? "").trim() || defaultBody;
          if (cfg && hasFiles && cfg.mode !== "multipart") {
            try {
              rawBody = mergeAttachmentsIntoJsonBody(rawBody, attachments, cfg);
            } catch (mergeErr) {
              setErr(mergeErr?.message || String(mergeErr));
              setBusy(false);
              return;
            }
          }
          init.body = rawBody;
        }
      }
      const started = performance.now();

      // Ejecutamos con fetch directo para conservar la stream del body.
      // Si la respuesta es text/event-stream, vamos por fetchSseStream (chunk a chunk)
      // para mostrar progreso real mientras llegan los eventos. Si no, ruta clásica.
      const probeController = new AbortController();
      const probeTimeoutMs = 60_000;
      const probeTimeout = setTimeout(() => probeController.abort(), probeTimeoutMs);
      const headersForFetch = { ...authHeaders(true), ...(init.headers || {}) };

      let headRes;
      try {
        headRes = await fetch(url, { ...init, headers: headersForFetch, signal: probeController.signal });
      } catch (e) {
        clearTimeout(probeTimeout);
        const msg = e?.name === "AbortError"
          ? `La conexión SSE no respondió en ${probeTimeoutMs / 1000}s. Revisa la consola del servidor (logs Azurite) — el handler puede estar colgado esperando OpenAI o el gate de permisos puede haber devuelto 401 sin iniciar el stream.`
          : (e.message || String(e));
        throw new Error(msg);
      }
      const contentType = headRes.headers.get("content-type") || "";
      const looksLikeSse = /text\/event-stream/i.test(contentType);
      const elapsedSoFar = Math.round(performance.now() - started);
      const isSse = looksLikeSse;

      if (isSse && headRes.ok) {
        // Path streaming real: leemos el body chunk a chunk y actualizamos
        // el resultado en cada `data: {…}\n\n` que llega del servidor.
        const decoder = new TextDecoder("utf-8");
        const reader = headRes.body?.getReader?.();
        let accumulated = "";
        const parser = createSseIncrementalParser();
        const finishedEvents = [];

        const consume = (chunk, done) => {
          const events = parser.feed(chunk);
          for (const ev of events) finishedEvents.push(ev);
          const elapsed = Math.round(performance.now() - started);
          setResult({
            status: headRes.status,
            statusText: headRes.statusText,
            elapsed,
            bytesIn: accumulated.length,
            body: accumulated,
            sseMarkdown: formatUnitTestSse(finishedEvents).markdown,
            sseEvents: [...finishedEvents],
            sseOk: finishedEvents.find((e) => e?.type === "summary")?.ok ?? null,
            sseStreaming: !done,
          });
        };

        try {
          if (reader) {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const piece = decoder.decode(value, { stream: true });
              accumulated += piece;
              consume(piece, false);
            }
            const tail = decoder.decode();
            if (tail) {
              accumulated += tail;
              consume(tail, true);
            }
            const tailEvents = parser.flush();
            for (const ev of tailEvents) finishedEvents.push(ev);
          } else {
            accumulated = await headRes.text();
            consume(accumulated, true);
          }
          const sse = formatUnitTestSse(finishedEvents);
          const elapsed = Math.round(performance.now() - started);
          if (sse.ok === false) setApiErr("El test unitario reportó fallos. Revise los pasos marcados con ❌.");
          setResult({
            status: headRes.status,
            statusText: headRes.statusText,
            elapsed,
            bytesIn: accumulated.length,
            body: accumulated,
            sseMarkdown: sse.markdown,
            sseEvents: [...finishedEvents],
            sseOk: sse.ok,
            sseStreaming: false,
          });
          clearTimeout(probeTimeout);
          setBusy(false);
          return;
        } catch (err) {
          clearTimeout(probeTimeout);
          const msg = err?.name === "AbortError"
            ? `La conexión SSE no cerró en ${probeTimeoutMs / 1000}s. El servidor puede estar colgado (logs Azurite) o el modelo no respondió.`
            : (err instanceof Error ? err.message : String(err));
          setErr(msg);
          setBusy(false);
          return;
        }
      }

      // No es SSE (o fue 401/403 antes del primer chunk). Consumimos el body
      // clásico y aplicamos la ruta existente.
      clearTimeout(probeTimeout);
      const text = await headRes.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      const probe = { data, res: headRes, text, ok: headRes.ok };
      const res = headRes;
      const ok = headRes.ok;
      const elapsed = elapsedSoFar;
      const bytesIn = textByteLength(text);
      const eventStreamHint = looksLikeSse;
      if (eventStreamHint && !ok) {
        const events = parseSseDataLines(text);
        const sse = formatUnitTestSse(events);
        setApiErr(formatHttpError(res.status, { statusText: res.statusText, endpoint: url }));
        setResult({ status: res.status, statusText: res.statusText, elapsed, bytesIn, body: sse.raw || text, sseMarkdown: sse.markdown, sseOk: sse.ok });
        return;
      }
      let pretty = text;
      try {
        pretty = jsonPretty(typeof data === "object" ? data : JSON.parse(text));
      } catch {
        /* plain */
      }
      if (!ok) {
        const detail = extractApiError(data) || (typeof data === "string" ? data : "");
        const swaggerPut = op.path === "/system/swagger.json" && op.method === "put";
        setApiErr(
          formatHttpError(res.status, {
            statusText: res.statusText,
            data: typeof data === "object" ? data : undefined,
            detail,
            endpoint: url,
            context: swaggerPut ? "swagger-put" : undefined,
            hint: detail.includes("GetConnection") ? "La base de datos no está accesible. Revisa GET /system/health → database.bconnected." : undefined,
          }),
        );
      } else {
        const envelopeErr = extractEnvelopeError(data);
        if (envelopeErr) setApiErr(envelopeErr);
      }
      setResult({ status: res.status, statusText: res.statusText, elapsed, bytesIn, body: pretty });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
    }
  }

  const btnColor = needsConfirm ? CONFIRM_BTN_COLOR[op.method] || "warning" : "primary";

  return (
    <Box className="isa-sw-tryit">
      <ParametersTable parameters={pathParams} values={values} onChange={onParamChange} lookupIndex={lookupIndex} spec={spec} opPath={op.path} catalogDocKeys={catalogDocKeys} expandId={expandId} disabled={busy} authEnabled={authEnabled} onNeedLogin={onNeedLogin} />
      {packQueryQ ? <QueryFiltersPanel ext={queryQExt} disabled={busy} onChange={(encoded) => onParamChange("q", encoded)} /> : null}
      {extraParams.length ? (
        <Box className="isa-sw-extra-params" sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {extraParams.map((p) => {
            const name = p.name || "";
            if (isIssListFilterParam(p)) {
              return (
                <IssListFilterField key={`${p.in}-${name}`} param={p} value={values[name] || ""} onChange={(v) => onParamChange(name, v)} disabled={busy} ns={ns} endpointLabel={`${op.method.toUpperCase()} ${op.path}`} authEnabled={authEnabled} onNeedLogin={onNeedLogin} />
              );
            }
            const ph = p.description || (p.example != null ? String(p.example) : name);
            return <TextField key={`${p.in}-${name}`} size="small" fullWidth disabled={busy} label={`${name} (${p.in})`} value={values[name] || ""} onChange={(e) => onParamChange(name, e.target.value)} placeholder={ph} />;
          })}
        </Box>
      ) : null}
      {shouldShowTryItBody(op) ? (
        <RequestBodySection op={op} spec={spec} example={specExample} bodyText={body} onBodyChange={setBody} attachments={attachments} onAttachmentsChange={setAttachments} disabled={busy} ns={ns} />
      ) : op.method === "delete" ? (
        <Typography variant="caption" color="text.secondary" className="isa-sw-tryit-no-body" sx={{ display: "block", mt: 1.5 }}>
          DELETE — no requiere body; use el parámetro de ruta arriba.
        </Typography>
      ) : null}
      <Box className="isa-sw-tryit-actions" sx={{ mt: 2, display: "flex", gap: 1.5, alignItems: "center", pl: 0.5, minWidth: 0 }}>
        <Button variant="contained" onClick={requestExecute} disabled={busy} color={btnColor} sx={{ flexShrink: 0 }} startIcon={busy ? null : <SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} style={{ color: "inherit" }} />}>
          {busy ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : "Ejecutar"}
        </Button>
        <Tooltip title={previewLabel} enterDelay={400} placement="top-start">
          <Typography component="code" variant="body2" className="isa-sw-tryit-url">{previewLabel}</Typography>
        </Tooltip>
      </Box>
      <DangerousOpConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={execute} copy={confirmCopy} busy={busy} ns={ns} />
      {err ? <HttpErrorAlert severity="error" message={err} sx={{ mt: 1.5 }} /> : null}
      {result ? (
        <Box className="isa-sw-tryit-result" sx={{ mt: 1.5 }}>
          {apiErr ? <HttpErrorAlert severity="warning" message={apiErr} sx={{ mb: 1 }} /> : null}
          <Typography variant="caption" color="text.secondary">
            {result.status} {result.statusText} · {result.elapsed} ms · {formatBytes(result.bytesIn || 0)}
            {result.sseOk === true ? " · test OK" : result.sseOk === false ? " · test con fallos" : ""}
          </Typography>
          {result.sseMarkdown ? (
            <SseStreamView
              events={result.sseEvents || []}
              scrollRef={sseScrollRef}
            />
          ) : (
            <Box sx={{ mt: 0.75 }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                <Tooltip title="Borrar respuesta">
                  <IconButton size="small" className="isa-sw-tryit-clear" aria-label="Borrar respuesta" onClick={() => { setResult(null); setApiErr(""); }}>
                    <iconify-icon icon="mdi:delete-outline" width="14" height="14" />
                  </IconButton>
                </Tooltip>
              </Box>
              <JsonCodeBlock value={result.body} />
            </Box>
          )}
        </Box>
      ) : null}
    </Box>
  );
}

export function MethodChip({ method }) {
  return <Chip className="isa-sw-chip isa-sw-method-chip" label={method.toUpperCase()} size="small" color={METHOD_COLORS[method] || "default"} sx={{ fontWeight: 700, minWidth: 56 }} />;
}
