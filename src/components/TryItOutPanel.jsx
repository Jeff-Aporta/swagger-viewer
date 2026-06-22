import { ParametersTable, pathParamsOnly } from "./ParametersTable.jsx";
import { RequestBodySection } from "./RequestBodySection.jsx";
import { ResponsesSection } from "./ResponsesSection.jsx";
import { DocPanel } from "./DocPanel.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import { QueryFiltersPanel } from "./QueryFiltersPanel.jsx";
import { IssListFilterField, isIssListFilterParam } from "./IssListFilterField.jsx";
import {
  jsonPretty,
  operationRequiresBearer,
  resolveServerUrl,
} from "../lib/openapi/openapi.js";
import { defaultTryItBodyText, opUsesRequestBody, resolveTryItBodyExample, shouldShowTryItBody } from "../lib/openapi/tryit-body.js";
import { getStoredJwt } from "../lib/auth/auth.js";
import { joinApiUrl } from "../lib/lookup/server-base.js";
import { fetchApiRaw, extractEnvelopeError } from "../lib/http/api-fetch.js";
import { formatHttpError, extractApiError } from "../lib/http/http-error.js";
import { formatUnitTestSse, isEventStreamResponse, parseSseDataLines } from "../lib/http/sse-parse.js";
import { renderMarkdown } from "../lib/ui/markdown.js";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { SwIcon } from "../lib/ui/sw-icon.jsx";
import { HttpErrorAlert } from "./HttpErrorAlert.jsx";

const { useState, useMemo, useEffect } = React;
const {
  Box,
  Button,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Chip,
  TextField,
  Tooltip,
} = MaterialUI;

const METHOD_COLORS = {
  get: "info",
  post: "success",
  put: "warning",
  patch: "secondary",
  delete: "error",
};

function applyPathParams(path, paramValues) {
  let url = path;
  for (const [k, v] of Object.entries(paramValues)) {
    url = url.replace(`{${k}}`, encodeURIComponent(v || ""));
  }
  return url;
}

function buildTryItOutUrl({ op, values, serverBase, spec, packQueryQ, queryParams }) {
  const server = serverBase || resolveServerUrl(spec) || (typeof location !== "undefined" ? location.origin : "");
  let url = joinApiUrl(server, applyPathParams(op.path, values));
  const qs = new URLSearchParams();
  if (packQueryQ) {
    const qVal = values.q;
    if (qVal != null && String(qVal).length) qs.set("q", String(qVal));
  } else {
    for (const p of queryParams) {
      const v = values[p.name];
      if (v != null && String(v).length) qs.set(p.name, v);
    }
  }
  const q = qs.toString();
  if (q) url += (url.includes("?") ? "&" : "?") + q;
  return url;
}

export function TryItOutPanel({
  op,
  spec,
  lookupIndex,
  onNeedLogin,
  authEnabled,
  ns = "ISA",
}) {
  const params = op.parameters || [];
  const queryParams = params.filter((p) => p.in === "query");
  const queryQExt = op["x-iss-query-q"];
  const packQueryQ = !!queryQExt;
  const pathParams = pathParamsOnly(params);
  const headerParams = params.filter((p) => p.in === "header");
  const extraParams = packQueryQ
    ? headerParams
    : [...queryParams, ...headerParams];

  const needsBearer = authEnabled && operationRequiresBearer(op, spec);
  const specExample = resolveTryItBodyExample(op);
  const defaultBody = useMemo(() => defaultTryItBodyText(op), [op.path, op.method, op.requestBody]);
  const { serverBase } = useServerBase();
  const [values, setValues] = useState({});
  const [body, setBody] = useState(defaultBody);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [apiErr, setApiErr] = useState("");

  useEffect(() => {
    setBody(defaultBody);
    setValues({});
    setResult(null);
    setErr("");
    setApiErr("");
  }, [op.path, op.method, defaultBody]);
  const previewUrl = useMemo(
    () => buildTryItOutUrl({ op, values, serverBase, spec, packQueryQ, queryParams }),
    [op, values, serverBase, spec, packQueryQ, queryParams],
  );
  const previewLabel = `${op.method.toUpperCase()} ${previewUrl}`;

  function onParamChange(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  async function execute() {
    if (needsBearer && !getStoredJwt()?.token) {
      onNeedLogin?.("Este endpoint requiere JWT. Inicia sesión para ejecutar.");
      return;
    }
    setBusy(true);
    setErr("");
    setApiErr("");
    setResult(null);
    try {
      const url = buildTryItOutUrl({ op, values, serverBase, spec, packQueryQ, queryParams });

      const headers = {};
      for (const p of headerParams) {
        const v = values[p.name];
        if (v) headers[p.name] = v;
      }

      const init = { method: op.method.toUpperCase(), headers };
      if (opUsesRequestBody(op.method)) {
        headers["Content-Type"] = "application/json";
        const payload = String(body ?? "").trim() || defaultBody;
        init.body = payload;
      }

      const started = performance.now();
      const { data, res, text, ok } = await fetchApiRaw(url, init);
      const elapsed = Math.round(performance.now() - started);
      if (isEventStreamResponse(res, text)) {
        const events = parseSseDataLines(text);
        const sse = formatUnitTestSse(events);
        if (!ok) {
          setApiErr(formatHttpError(res.status, { statusText: res.statusText, endpoint: url }));
        } else if (sse.ok === false) {
          setApiErr("El test unitario reportó fallos. Revise los pasos marcados con ❌.");
        }
        setResult({
          status: res.status,
          statusText: res.statusText,
          elapsed,
          body: sse.raw || text,
          sseMarkdown: sse.markdown,
          sseOk: sse.ok,
        });
        return;
      }
      let pretty = text;
      try {
        pretty = jsonPretty(typeof data === "object" ? data : JSON.parse(text));
      } catch {
        /* plain text */
      }
      if (!ok) {
        const detail = extractApiError(data) || (typeof data === "string" ? data : "");
        setApiErr(
          formatHttpError(res.status, {
            statusText: res.statusText,
            data: typeof data === "object" ? data : undefined,
            detail,
            hint: detail.includes("GetConnection")
              ? "La base de datos no está accesible. Revisa GET /health → database.bconnected."
              : undefined,
          }),
        );
      } else {
        const envelopeErr = extractEnvelopeError(data);
        if (envelopeErr) setApiErr(envelopeErr);
      }
      setResult({ status: res.status, statusText: res.statusText, elapsed, body: pretty });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box className="isa-sw-tryit">
      <ParametersTable
        parameters={pathParams}
        values={values}
        onChange={onParamChange}
        lookupIndex={lookupIndex}
        disabled={busy}
        authEnabled={authEnabled}
        onNeedLogin={onNeedLogin}
      />
      {packQueryQ ? (
        <QueryFiltersPanel
          ext={queryQExt}
          disabled={busy}
          onChange={(encoded) => onParamChange("q", encoded)}
        />
      ) : null}
      {extraParams.length ? (
        <Box className="isa-sw-extra-params" sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {extraParams.map((p) => {
            const name = p.name || "";
            if (isIssListFilterParam(p)) {
              return (
                <IssListFilterField
                  key={`${p.in}-${name}`}
                  param={p}
                  value={values[name] || ""}
                  onChange={(v) => onParamChange(name, v)}
                  disabled={busy}
                  ns={ns}
                  endpointLabel={`${op.method.toUpperCase()} ${op.path}`}
                  authEnabled={authEnabled}
                  onNeedLogin={onNeedLogin}
                />
              );
            }
            const ph = p.description || (p.example != null ? String(p.example) : name);
            return (
              <TextField
                key={`${p.in}-${name}`}
                size="small"
                fullWidth
                disabled={busy}
                label={`${name} (${p.in})`}
                value={values[name] || ""}
                onChange={(e) => onParamChange(name, e.target.value)}
                placeholder={ph}
              />
            );
          })}
        </Box>
      ) : null}
      {shouldShowTryItBody(op) ? (
        <RequestBodySection op={op} example={specExample} bodyText={body} onBodyChange={setBody} disabled={busy} ns={ns} />
      ) : op.method === "delete" ? (
        <Typography variant="caption" color="text.secondary" className="isa-sw-tryit-no-body" sx={{ display: "block", mt: 1.5 }}>
          DELETE — no requiere body; use el parámetro de ruta arriba.
        </Typography>
      ) : null}
      <Box className="isa-sw-tryit-actions" sx={{ mt: 2, display: "flex", gap: 1.5, alignItems: "center", pl: 0.5, minWidth: 0 }}>
        <Button
          variant="contained"
          onClick={execute}
          disabled={busy}
          sx={{ flexShrink: 0 }}
          startIcon={
            busy ? null : <SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} style={{ color: "inherit" }} />
          }
        >
          {busy ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : "Ejecutar"}
        </Button>
        <Tooltip title={previewLabel} enterDelay={400} placement="top-start">
          <Typography component="code" variant="body2" className="isa-sw-tryit-url">
            {previewLabel}
          </Typography>
        </Tooltip>
      </Box>
      {err ? (
        <HttpErrorAlert severity="error" message={err} sx={{ mt: 1.5 }} />
      ) : null}
      {result ? (
        <Box sx={{ mt: 1.5 }}>
          {apiErr ? <HttpErrorAlert severity="warning" message={apiErr} sx={{ mb: 1 }} /> : null}
          <Typography variant="caption" color="text.secondary">
            {result.status} {result.statusText} · {result.elapsed} ms
            {result.sseOk === true ? " · test OK" : result.sseOk === false ? " · test con fallos" : ""}
          </Typography>
          {result.sseMarkdown ? (
            <Box
              className="isa-sw-doc isa-sw-tryit-sse"
              sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: "action.hover", overflow: "auto", maxHeight: "28rem" }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(result.sseMarkdown) }}
            />
          ) : (
            <JsonCodeBlock value={result.body} />
          )}
        </Box>
      ) : null}
    </Box>
  );
}

export function MethodChip({ method }) {
  return (
    <Chip
      className="isa-sw-chip isa-sw-method-chip"
      label={method.toUpperCase()}
      size="small"
      color={METHOD_COLORS[method] || "default"}
      sx={{ fontWeight: 700, minWidth: 56 }}
    />
  );
}
