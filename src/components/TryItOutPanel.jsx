import { ParametersTable, pathParamsOnly } from "./ParametersTable.jsx";
import { RequestBodySection } from "./RequestBodySection.jsx";
import { ResponsesSection } from "./ResponsesSection.jsx";
import { DocPanel } from "./DocPanel.jsx";
import { JsonCodeBlock } from "./JsonCodeBlock.jsx";
import {
  extractJsonExample,
  jsonPretty,
  operationRequiresBearer,
  resolveServerUrl,
} from "../lib/openapi.js";
import { getStoredJwt } from "../lib/auth.js";
import { SwIcon } from "../lib/sw-icon.jsx";

const { useState } = React;
const {
  Box,
  Button,
  Tabs,
  Tab,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  TextField,
} = MaterialUI;

const METHOD_COLORS = {
  get: "info",
  post: "success",
  put: "warning",
  patch: "secondary",
  delete: "error",
};

function buildUrl(server, path, paramValues) {
  let url = path;
  for (const [k, v] of Object.entries(paramValues)) {
    url = url.replace(`{${k}}`, encodeURIComponent(v || ""));
  }
  return `${server.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
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
  const pathParams = pathParamsOnly(params);
  const headerParams = params.filter((p) => p.in === "header");
  const extraParams = [...queryParams, ...headerParams];

  const [values, setValues] = useState({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const needsBearer = authEnabled && operationRequiresBearer(op, spec);
  const specExample = extractJsonExample(op.requestBody?.content?.["application/json"]);

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
    setResult(null);
    try {
      const server = resolveServerUrl(spec) || location.origin;
      let url = buildUrl(server, op.path, values);
      const qs = new URLSearchParams();
      for (const p of queryParams) {
        const v = values[p.name];
        if (v != null && String(v).length) qs.set(p.name, v);
      }
      const q = qs.toString();
      if (q) url += (url.includes("?") ? "&" : "?") + q;

      const headers = { Accept: "application/json" };
      for (const p of headerParams) {
        const v = values[p.name];
        if (v) headers[p.name] = v;
      }
      const jwt = getStoredJwt()?.token;
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const init = { method: op.method.toUpperCase(), headers };
      if (op.requestBody && ["post", "put", "patch"].includes(op.method)) {
        headers["Content-Type"] = "application/json";
        init.body = body || (specExample !== undefined ? JSON.stringify(specExample) : "{}");
      }

      const started = performance.now();
      const res = await fetch(url, init);
      const elapsed = Math.round(performance.now() - started);
      let text = await res.text();
      try {
        text = jsonPretty(JSON.parse(text));
      } catch {
        /* plain text */
      }
      setResult({ status: res.status, statusText: res.statusText, elapsed, body: text });
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
      />
      {extraParams.length ? (
        <Box className="isa-sw-extra-params" sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {extraParams.map((p) => {
            const name = p.name || "";
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
      <RequestBodySection
        requestBody={op.requestBody}
        example={specExample}
        bodyText={body}
        onBodyChange={setBody}
        disabled={busy}
        ns={ns}
      />
      <Box sx={{ mt: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={execute}
          disabled={busy}
          startIcon={
            busy ? null : <SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} style={{ color: "inherit" }} />
          }
        >
          {busy ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : "Ejecutar"}
        </Button>
        {needsBearer ? (
          <Chip
            size="small"
            icon={<SwIcon icon="mdi:lock-outline" size={14} ns={ns} />}
            label="Bearer JWT"
            color="warning"
            variant="outlined"
          />
        ) : null}
      </Box>
      {err ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {err}
        </Alert>
      ) : null}
      {result ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {result.status} {result.statusText} · {result.elapsed} ms
          </Typography>
          <JsonCodeBlock value={result.body} minHeight="10rem" />
        </Box>
      ) : null}
    </Box>
  );
}

export function MethodChip({ method }) {
  return (
    <Chip
      label={method.toUpperCase()}
      size="small"
      color={METHOD_COLORS[method] || "default"}
      sx={{ fontWeight: 700, minWidth: 56 }}
    />
  );
}
