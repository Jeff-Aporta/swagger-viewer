import { SwaggerViewer } from "../../../src/SwaggerViewer.jsx";
import { parseIsDocument, isDocumentText } from "../../../src/lib/is-document.js";
import { IsEditorDrawer } from "./IsEditorDrawer.jsx";
import { buildDemoExportUrls, revokeDemoExportUrls } from "./demo-exports.js";
import { SwIcon } from "../../../src/lib/sw-icon.jsx";
import sampleIsDoc from "../../openapi/sample.is.json";

const { useState, useEffect, useCallback, useRef, useMemo } = React;
const { Fab, Tooltip } = MaterialUI;

const DEMO_EXPORT_NAMES = {
  openApiDownloadName: "openapi.json",
  postmanDownloadName: "iss-ayudascpia.postman_collection.json",
  isDownloadName: "iss-ayudascpia.is.json",
};

const DEMO_BRAND_ICON = "mdi:file-code-outline";

function enrichViewerConfig(viewer = {}) {
  return {
    shell: true,
    ns: "ISA",
    ...viewer,
    brand: { ...viewer.brand, icon: DEMO_BRAND_ICON, title: "IS-Swagger" },
  };
}

function applyIsDocument(doc) {
  const parsed = parseIsDocument(doc);
  if (!parsed?.spec) {
    throw new Error("Se espera kind «insoft.swagger-viewer» con objetos viewer y spec.");
  }
  const { spec: _omit, ...viewer } = parsed.config || {};
  return { config: enrichViewerConfig(viewer), spec: parsed.spec };
}

export function App() {
  const params = new URLSearchParams(location.search);
  const specUrl = params.get("spec");
  const [drawerOpen, setDrawerOpen] = useState(() => params.has("editor"));
  const [sourceText, setSourceText] = useState("");
  const [parseErr, setParseErr] = useState("");
  const [applied, setApplied] = useState(null);
  const getEditorTextRef = useRef(() => "");
  const exportRevokeRef = useRef([]);
  const ns = "ISA";

  const handleApply = useCallback(
    (forcedText) => {
      const raw = String(forcedText ?? getEditorTextRef.current?.() ?? sourceText ?? "").trim();
      if (!raw) {
        setParseErr("El editor está vacío.");
        return;
      }
      try {
        const doc = JSON.parse(raw);
        setApplied(applyIsDocument(doc));
        setParseErr("");
        setSourceText(isDocumentText(doc));
        setDrawerOpen(false);
      } catch (e) {
        setParseErr(e?.message || String(e));
      }
    },
    [sourceText],
  );

  const handleFormat = useCallback(() => {
    try {
      setSourceText(isDocumentText(JSON.parse(sourceText)));
      setParseErr("");
    } catch (e) {
      setParseErr(e?.message || String(e));
    }
  }, [sourceText]);

  useEffect(() => {
    if (specUrl) return;
    try {
      setSourceText(isDocumentText(sampleIsDoc));
      setApplied(applyIsDocument(sampleIsDoc));
    } catch (e) {
      setParseErr(e?.message || String(e));
    }
  }, [specUrl]);

  useEffect(() => () => revokeDemoExportUrls(exportRevokeRef.current), []);

  const viewerConfig = useMemo(() => {
    if (!applied?.spec) return null;
    revokeDemoExportUrls(exportRevokeRef.current);
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
  }, [applied]);

  if (specUrl) {
    return React.createElement(SwaggerViewer, {
      config: {
        ns: "ISA",
        shell: true,
        brand: { title: "IS-Swagger", icon: DEMO_BRAND_ICON },
        auth: { enabled: false },
        exports: { openApiUrl: specUrl, openApiDownloadName: "openapi.json" },
        specUrl,
      },
    });
  }

  if (!viewerConfig || !applied?.spec) {
    return React.createElement("div", { className: "isa-app-boot" }, "Cargando IS-Swagger…");
  }

  return (
    <>
      <SwaggerViewer config={viewerConfig} spec={applied.spec} />

      <Tooltip title="Editor JSON IS" placement="left" arrow>
        <Fab className="isa-sw-demo__fab" color="primary" aria-label="Abrir editor JSON IS" onClick={() => setDrawerOpen(true)}>
          <SwIcon icon="mdi:code-json" size={24} ns={ns} />
        </Fab>
      </Tooltip>

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
      />
    </>
  );
}
