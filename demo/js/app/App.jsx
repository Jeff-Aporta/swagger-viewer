import { SwaggerViewer } from "../../../src/SwaggerViewer.jsx";
import { parseIsDocument, isDocumentText } from "../../../src/lib/openapi/is-document.js";
import { readBrandFromMeta } from "../../../src/lib/brand/viewer-brand.js";
import { fetchRemoteOpenApiConfig, inferSwaggerUrls, normalizeApiBase, putRemoteOpenApiConfig } from "../../../src/lib/api/swagger-api.js";
import { fetchRemoteIsDocument } from "../../../src/lib/api/swagger-remote.js";
import { notifyApiError } from "../../../src/lib/api/api-notify.js";
import { parseEmbedParams, resolveConnBrand } from "../../../src/lib/api/conn-config.js";
import { connectWithFallback, isLocalApiBase } from "../../../src/lib/api/api-base-resolve.js";
import { getStoredJwt } from "../../../src/lib/auth/auth.js";
import { resolveAuthConfig } from "../../../src/lib/auth/orchestrator-base.js";
import { IsEditorDrawer } from "./IsEditorDrawer.jsx";
import { PayloadInspectorModal } from "./PayloadInspectorModal.jsx";
import { WelcomeScreen } from "./WelcomeScreen.jsx";
import { ConnectionScreen } from "./ConnectionScreen.jsx";
import { DemoShell } from "./DemoShell.jsx";
import { buildDemoExportUrls, revokeDemoExportUrls } from "./demo-exports.js";
import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";

const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { Fab, Tooltip, Box, Alert, Button } = MaterialUI;

const DEMO_EXPORT_NAMES = {
  openApiDownloadName: "openapi.json",
  postmanDownloadName: "iss-ayudascpia.postman_collection.json",
  isDownloadName: "iss-ayudascpia.is.json",
};

function demoBrandDefaults(conn) {
  const connBrand = resolveConnBrand(conn);
  const meta = readBrandFromMeta();
  return {
    title: connBrand?.title || meta.title || "IS-Swagger",
    icon: connBrand?.icon || meta.icon || "mdi:file-code-outline",
  };
}

const DEMO_NS = "ISS";

function enrichViewerConfig(viewer = {}, { remoteApiBase, conn } = {}) {
  const defaults = demoBrandDefaults(conn);
  const auth = resolveAuthConfig({ enabled: true, loginKind: "portal", ...viewer.auth }, remoteApiBase || viewer.apiBase);
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
  const { spec: _omit, specUrl: _specUrl, ...viewer } = parsed.config || {};
  return { config: enrichViewerConfig(viewer, opts), spec: parsed.spec };
}

function formatConnectError(e, apiBase) {
  const raw = e?.message || String(e);
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return `No se pudo contactar la API (${apiBase || "…/api"}). Compruebe que el servicio esté en marcha y CORS habilitado.`;
  }
  return raw;
}

export function App() {
  const params = new URLSearchParams(location.search);
  const conn = useMemo(() => parseEmbedParams(params), []);
  const embedMode = !!conn?.embed;
  const fixedServer = !!conn?.fixedServer;
  const specUrl = params.get("spec");
  const apiParam = params.get("api");
  const connApiBase = conn?.apiBase ? normalizeApiBase(conn.apiBase) : "";
  const [drawerOpen, setDrawerOpen] = useState(() => params.has("editor"));
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [parseErr, setParseErr] = useState("");
  const [applied, setApplied] = useState(null);
  const [apiBase, setApiBase] = useState(() => connApiBase || normalizeApiBase(apiParam ? decodeURIComponent(apiParam) : ""));
  const [connectBusy, setConnectBusy] = useState(() => !!(connApiBase && conn?.auto !== false));
  const [remoteUrls, setRemoteUrls] = useState(null);
  const [remoteBuilt, setRemoteBuilt] = useState(null);
  const getEditorTextRef = useRef(() => "");
  const exportRevokeRef = useRef([]);
  const ns = applied?.config?.ns ?? DEMO_NS;

  /** Bases de conexión: SOLO ?conn= o ?api=. Prohibido fallback a presets/LS. */
  function resolveInitialBases() {
    const list = [];
    if (connApiBase) list.push(connApiBase);
    if (apiParam) {
      const p = normalizeApiBase(decodeURIComponent(apiParam));
      if (p && !list.includes(p)) list.push(p);
    }
    return list;
  }

  const connectApi = useCallback(
    async (baseInput, { forceBases } = {}) => {
      const bases = forceBases || resolveInitialBases();
      const primary = bases[0];
      if (!primary) {
        setParseErr("Sin conexión. Abra el visor con ?conn= o use el botón «Conectar con ISS PatyIA».");
        return;
      }
      setConnectBusy(true);
      setParseErr("");
      try {
        const { doc, urls, built } = await connectWithFallback(fetchRemoteIsDocument, bases);
        setRemoteUrls(urls);
        setRemoteBuilt(built);
        setApiBase(urls.apiBase);
        setSourceText(isDocumentText(doc));
        setApplied(applyIsDocument(doc, { remoteApiBase: urls.apiBase, conn }));
        setParseErr("");
        setDrawerOpen(false);
      } catch (e) {
        const msg = formatConnectError(e, primary);
        notifyApiError(msg);
        setParseErr(msg);
      } finally {
        setConnectBusy(false);
      }
    },
    [conn],
  );

  useEffect(() => {
    if (specUrl) return;
    const bases = resolveInitialBases();
    if (!bases.length || (conn && conn.auto === false)) return;
    connectApi(bases[0], { forceBases: bases });
  }, [specUrl, apiParam, conn, connectApi]);

  const pullConfig = useCallback(async () => {
    if (!apiBase) {
      setParseErr("Sin base API conectada. Use «Conectar con ISS PatyIA» o indique ?api=.");
      return;
    }
    setConnectBusy(true);
    setParseErr("");
    try {
      const { doc } = await fetchRemoteOpenApiConfig(apiBase);
      setSourceText(isDocumentText(doc));
    } catch (e) {
      const msg = formatConnectError(e, apiBase);
      notifyApiError(msg);
      setParseErr(msg);
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
      const msg = notifyApiError(e?.message || String(e));
      setParseErr(msg);
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
        setApplied(applyIsDocument(doc, { remoteApiBase: apiBase, conn }));
        setParseErr("");
        setSourceText(isDocumentText(doc));
        setDrawerOpen(false);
      } catch (e) {
        setParseErr(e?.message || String(e));
      }
    },
    [sourceText, apiBase, conn],
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
    if (urls?.apiBase && remoteBuilt) {
      const names = applied.config.exports || {};
      return {
        ...applied.config,
        shell: true,
        apiBase: urls.apiBase,
        exports: {
          apiBase: urls.apiBase,
          openApiDownloadName: names.openApiDownloadName || DEMO_EXPORT_NAMES.openApiDownloadName,
          postmanDownloadName: names.postmanDownloadName || DEMO_EXPORT_NAMES.postmanDownloadName,
          isDownloadName: names.isDownloadName || DEMO_EXPORT_NAMES.isDownloadName,
          openApiGetDocument: () => remoteBuilt.openApi,
          postmanGetDocument: () => remoteBuilt.postman,
          isGetDocument: () => remoteBuilt.is,
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
  }, [applied, apiBase, remoteUrls, remoteBuilt]);

  const payloadInspector = (
    <PayloadInspectorModal
      open={inspectorOpen}
      onClose={() => setInspectorOpen(false)}
      apiBase={apiBase}
      connPaths={conn?.paths}
      remoteBuilt={remoteBuilt}
      ns={ns}
    />
  );

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
      onConnectApi={() => connectApi(apiBase)}
      onPullConfig={pullConfig}
      onPushConfig={pushConfig}
      connectBusy={connectBusy}
      fixedServer={fixedServer}
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
    const brand = demoBrandDefaults(conn);
    const retryBases = resolveInitialBases();
    if (embedMode || connectBusy || parseErr) {
      return (
        <>
          <ConnectionScreen
            ns={DEMO_NS}
            title={brand.title}
            icon={brand.icon}
            busy={connectBusy}
            error={!connectBusy ? parseErr : ""}
            subtitle={connectBusy ? `Cargando ${brand.title}…` : ""}
            onRetry={retryBases.length ? () => connectApi(retryBases[0], { forceBases: retryBases }) : null}
          />
          {drawerOpen ? drawer : null}
          {payloadInspector}
        </>
      );
    }
    return (
      <DemoShell ns={DEMO_NS}>
        <WelcomeScreen ns={DEMO_NS} />
        {drawerOpen ? drawer : null}
      </DemoShell>
    );
  }

  return (
    <>
      <SwaggerViewer config={viewerConfig} spec={applied.spec} onReload={apiBase ? () => connectApi(apiBase) : null} reloadBusy={connectBusy} />
      {!embedMode ? (
        <Tooltip title="Carga IS-Swagger (JSONs)" placement="left" arrow>
          <Fab className="isa-sw-demo__fab" color="primary" aria-label="Ver JSONs de carga" onClick={() => setInspectorOpen(true)}>
            <SwIcon icon="mdi:database-eye-outline" size={24} ns={ns} />
          </Fab>
        </Tooltip>
      ) : null}
      {drawerOpen ? drawer : null}
      {payloadInspector}
    </>
  );
}
