import { SwaggerViewer } from "../../../src/SwaggerViewer.jsx";
import { parseIsDocument, isDocumentText } from "../../../src/lib/openapi/is-document.js";
import { readBrandFromMeta } from "../../../src/lib/brand/viewer-brand.js";
import { apiOrigin, fetchRemoteIsDocument, fetchRemoteOpenApiConfig, inferSwaggerUrls, normalizeApiBase, putRemoteOpenApiConfig } from "../../../src/lib/api/swagger-api.js";
import { parseEmbedParams } from "../../../src/lib/api/conn-config.js";
import { getStoredJwt } from "../../../src/lib/auth/auth.js";
import { IsEditorDrawer } from "./IsEditorDrawer.jsx";
import { WelcomeScreen } from "./WelcomeScreen.jsx";
import { DemoShell } from "./DemoShell.jsx";
import { readStoredApiBase, storeApiBase } from "./ApiBaseSelect.jsx";
import { buildDemoExportUrls, revokeDemoExportUrls } from "./demo-exports.js";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";

const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { Fab, Tooltip, Box, Alert, CircularProgress } = MaterialUI;

const DEMO_EXPORT_NAMES = {
  openApiDownloadName: "openapi.json",
  postmanDownloadName: "iss-ayudascpia.postman_collection.json",
  isDownloadName: "iss-ayudascpia.is.json",
};

function demoBrandDefaults() {
  const meta = readBrandFromMeta();
  return {
    title: meta.title || "IS-Swagger",
    icon: meta.icon || "mdi:file-code-outline",
  };
}

const DEMO_NS = "ISS";

function enrichViewerConfig(viewer = {}, { remoteApiBase } = {}) {
  const defaults = demoBrandDefaults();
  const origin = remoteApiBase ? apiOrigin(remoteApiBase) : viewer.auth?.loginUrl;
  const auth = { enabled: true, loginKind: "portal", loginPath: "/api/auth/portal-login", ...viewer.auth };
  if (origin) auth.loginUrl = origin.replace(/\/$/, "");
  return {
    shell: true,
    brandLock: true,
    ...viewer,
    ns: viewer.ns ?? DEMO_NS,
    brand: defaults,
    auth,
  };
}

function applyIsDocument(doc, opts = {}) {
  const parsed = parseIsDocument(doc);
  if (!parsed?.spec) {
    throw new Error("Se espera kind «insoft.swagger-viewer» con objetos viewer y spec.");
  }
  const { spec: _omit, ...viewer } = parsed.config || {};
  return { config: enrichViewerConfig(viewer, opts), spec: parsed.spec };
}

export function App() {
  const params = new URLSearchParams(location.search);
  const conn = useMemo(() => parseEmbedParams(params), []);
  const embedMode = !!conn?.embed;
  const specUrl = params.get("spec");
  const apiParam = params.get("api");
  const connApiBase = conn?.apiBase ? normalizeApiBase(conn.apiBase) : "";
  const [drawerOpen, setDrawerOpen] = useState(() => params.has("editor"));
  const [sourceText, setSourceText] = useState("");
  const [parseErr, setParseErr] = useState("");
  const [applied, setApplied] = useState(null);
  const [apiBase, setApiBase] = useState(() => connApiBase || normalizeApiBase(apiParam ? decodeURIComponent(apiParam) : "") || readStoredApiBase());
  const [connectBusy, setConnectBusy] = useState(() => !!(connApiBase && conn?.auto !== false));
  const [remoteUrls, setRemoteUrls] = useState(null);
  const getEditorTextRef = useRef(() => "");
  const exportRevokeRef = useRef([]);
  const ns = applied?.config?.ns ?? DEMO_NS;

  const connectApi = useCallback(
    async (baseInput) => {
      const base = storeApiBase(baseInput || apiBase);
      if (!base) {
        setParseErr("Indique la base API (…/api/).");
        return;
      }
      setConnectBusy(true);
      setParseErr("");
      try {
        const { doc, urls } = await fetchRemoteIsDocument(base);
        setRemoteUrls(urls);
        setApiBase(urls.apiBase);
        setSourceText(isDocumentText(doc));
        setApplied(applyIsDocument(doc, { remoteApiBase: urls.apiBase }));
        setDrawerOpen(false);
      } catch (e) {
        setParseErr(e?.message || String(e));
      } finally {
        setConnectBusy(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    if (specUrl) return;
    const fromApi = apiParam ? normalizeApiBase(decodeURIComponent(apiParam)) : "";
    const base = connApiBase || fromApi;
    if (!base || (conn && conn.auto === false && !connApiBase)) return;
    if (connApiBase || fromApi) connectApi(base);
  }, [specUrl, apiParam, connApiBase, conn, connectApi]);

  const pullConfig = useCallback(async () => {
    if (!apiBase) {
      setParseErr("Indique la base API (…/api/).");
      return;
    }
    setConnectBusy(true);
    setParseErr("");
    try {
      const { doc } = await fetchRemoteOpenApiConfig(apiBase);
      setSourceText(isDocumentText(doc));
    } catch (e) {
      setParseErr(e?.message || String(e));
    } finally {
      setConnectBusy(false);
    }
  }, [apiBase]);

  const pushConfig = useCallback(async () => {
    const raw = String(getEditorTextRef.current?.() ?? sourceText ?? "").trim();
    if (!raw) {
      setParseErr("El editor está vacío.");
      return;
    }
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      setParseErr(e?.message || "JSON inválido.");
      return;
    }
    if (doc?.kind !== "insoft.openapi-config") {
      setParseErr("PUT requiere kind «insoft.openapi-config» (use Obtener config).");
      return;
    }
    const jwt = getStoredJwt()?.token;
    if (!jwt) {
      setParseErr("Inicie sesión en el visor para publicar (PUT).");
      return;
    }
    setConnectBusy(true);
    setParseErr("");
    try {
      await putRemoteOpenApiConfig(apiBase, doc, jwt);
      await connectApi(apiBase);
    } catch (e) {
      setParseErr(e?.message || String(e));
    } finally {
      setConnectBusy(false);
    }
  }, [apiBase, sourceText, connectApi]);

  const handleApply = useCallback(
    (forcedText) => {
      const raw = String(forcedText ?? getEditorTextRef.current?.() ?? sourceText ?? "").trim();
      if (!raw) {
        setParseErr("El editor está vacío.");
        return;
      }
      try {
        const doc = JSON.parse(raw);
        setApplied(applyIsDocument(doc, { remoteApiBase: apiBase }));
        setParseErr("");
        setSourceText(isDocumentText(doc));
        setDrawerOpen(false);
      } catch (e) {
        setParseErr(e?.message || String(e));
      }
    },
    [sourceText, apiBase],
  );

  const handleFormat = useCallback(() => {
    try {
      setSourceText(isDocumentText(JSON.parse(sourceText)));
      setParseErr("");
    } catch (e) {
      setParseErr(e?.message || String(e));
    }
  }, [sourceText]);

  useEffect(() => () => revokeDemoExportUrls(exportRevokeRef.current), []);

  useEffect(() => {
    function onBrandHome() {
      if (embedMode) return;
      setApplied(null);
      setRemoteUrls(null);
      setParseErr("");
      setDrawerOpen(false);
    }
    window.addEventListener("isa:brand-home", onBrandHome);
    return () => window.removeEventListener("isa:brand-home", onBrandHome);
  }, [embedMode]);

  const viewerConfig = useMemo(() => {
    if (!applied?.spec) return null;
    revokeDemoExportUrls(exportRevokeRef.current);
    const urls = remoteUrls || (apiBase ? inferSwaggerUrls(apiBase) : null);
    if (urls?.get) {
      return {
        ...applied.config,
        shell: true,
        exports: {
          openApiUrl: urls.get,
          openApiDownloadName: applied.config.exports?.openApiDownloadName || DEMO_EXPORT_NAMES.openApiDownloadName,
          postmanUrl: urls.postman,
          postmanDownloadName: applied.config.exports?.postmanDownloadName || DEMO_EXPORT_NAMES.postmanDownloadName,
          isUrl: urls.is,
          isDownloadName: applied.config.exports?.isDownloadName || DEMO_EXPORT_NAMES.isDownloadName,
        },
      };
    }
    const names = { ...DEMO_EXPORT_NAMES, ...(applied.config.exports || {}) };
    const runtime = buildDemoExportUrls(applied.spec, names);
    exportRevokeRef.current = runtime.revoke;
    return {
      ...applied.config,
      shell: true,
      exports: {
        openApiUrl: runtime.openApiUrl,
        openApiDownloadName: runtime.openApiDownloadName,
        postmanUrl: runtime.postmanUrl,
        postmanDownloadName: runtime.postmanDownloadName,
        isDownloadName: runtime.isDownloadName,
      },
    };
  }, [applied, apiBase, remoteUrls]);

  const drawer = (
    <IsEditorDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      sourceText={sourceText}
      onChange={setSourceText}
      onApply={() => handleApply()}
      onFormat={handleFormat}
      getTextRef={getEditorTextRef}
      parseErr={parseErr}
      ns={ns}
      apiBase={apiBase}
      onApiBaseChange={setApiBase}
      onConnectApi={() => connectApi()}
      onPullConfig={pullConfig}
      onPushConfig={pushConfig}
      connectBusy={connectBusy}
      scopes={applied?.config?.scopes}
    />
  );

  if (specUrl) {
    return React.createElement(SwaggerViewer, {
      config: {
        ns: DEMO_NS,
        shell: true,
        brandLock: true,
        brand: demoBrandDefaults(),
        auth: { enabled: false },
        exports: { openApiUrl: specUrl, openApiDownloadName: "openapi.json" },
        specUrl,
      },
    });
  }

  if (!viewerConfig || !applied?.spec) {
    if (embedMode) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2, px: 2 }}>
          {connectBusy ? <CircularProgress /> : null}
          {parseErr ? <Alert severity="error" sx={{ maxWidth: 560 }}>{parseErr}</Alert> : null}
          {drawer}
        </Box>
      );
    }
    return (
      <DemoShell ns={DEMO_NS}>
        <WelcomeScreen ns={DEMO_NS} onOpenEditor={() => setDrawerOpen(true)} onConnectCustom={() => setDrawerOpen(true)} />
        {parseErr ? (
          <Box sx={{ width: "100%", maxWidth: 680, px: { xs: 0.5, sm: 1 }, pb: 2 }}>
            <Alert severity="error">{parseErr}</Alert>
          </Box>
        ) : null}
        {drawer}
      </DemoShell>
    );
  }

  return (
    <>
      <SwaggerViewer config={viewerConfig} spec={applied.spec} />
      {!embedMode ? (
        <Tooltip title="Constructor IS-Swagger" placement="left" arrow>
          <Fab className="isa-sw-demo__fab" color="primary" aria-label="Abrir constructor" onClick={() => setDrawerOpen(true)}>
            <SwIcon icon="mdi:code-json" size={24} ns={ns} />
          </Fab>
        </Tooltip>
      ) : null}
      {drawer}
    </>
  );
}
