import { SwaggerViewer } from "../../../src/SwaggerViewer.jsx";
import { parseIsDocument, isDocumentText } from "../../../src/lib/is-document.js";
import { IsJsonEditor } from "./IsJsonEditor.jsx";
import { SwIcon } from "../../../src/lib/sw-icon.jsx";

const { useState, useEffect, useCallback } = React;
const { Box, Button, Alert, Typography, IconButton, Tooltip } = MaterialUI;

const DEMO_EXPORTS = {
  openApiDownloadName: "openapi.json",
  postmanDownloadName: "collection.postman.json",
  isDownloadName: "api.is.json",
};

function enrichViewerConfig(viewer = {}) {
  const config = { shell: true, ns: "ISA", ...viewer };
  if (!config.exports) config.exports = { ...DEMO_EXPORTS };
  return config;
}

function applyIsDocument(doc) {
  const parsed = parseIsDocument(doc);
  if (!parsed?.spec) {
    throw new Error("Se espera kind «insoft.swagger-viewer» con objetos viewer y spec.");
  }
  const { spec: _omit, ...viewer } = parsed.config || {};
  const config = enrichViewerConfig(viewer);
  return { config, spec: parsed.spec };
}

export function App() {
  const params = new URLSearchParams(location.search);
  const specUrl = params.get("spec");
  const [sourceText, setSourceText] = useState("");
  const [parseErr, setParseErr] = useState("");
  const [applied, setApplied] = useState(null);
  const [editorOpen, setEditorOpen] = useState(() => !params.has("solo"));
  const [loading, setLoading] = useState(!specUrl);
  const ns = "ISA";

  const handleApply = useCallback((text = sourceText) => {
    try {
      const doc = JSON.parse(text);
      setApplied(applyIsDocument(doc));
      setParseErr("");
      setSourceText(isDocumentText(doc));
    } catch (e) {
      setParseErr(e?.message || String(e));
    }
  }, [sourceText]);

  useEffect(() => {
    if (specUrl) return;
    const url = new URL("../../openapi/sample.is.json", import.meta.url).href;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar sample.is.json (${r.status})`);
        return r.json();
      })
      .then((doc) => {
        setSourceText(isDocumentText(doc));
        setApplied(applyIsDocument(doc));
      })
      .catch((e) => setParseErr(e.message || String(e)))
      .finally(() => setLoading(false));
  }, [specUrl]);

  if (specUrl) {
    const config = {
      ns: "ISA",
      shell: true,
      brand: { title: "Swagger Viewer", icon: "mdi:api" },
      auth: { enabled: false },
      exports: { openApiUrl: specUrl, openApiDownloadName: "openapi.json" },
      specUrl,
    };
    return React.createElement(SwaggerViewer, { config });
  }

  if (loading) {
    return React.createElement("div", { className: "isa-app-boot" }, "Cargando documento IS…");
  }

  return (
    <Box className="isa-sw-demo">
      {editorOpen ? (
        <Box className="isa-sw-demo__editor" component="section" aria-label="Editor JSON IS">
          <Box className="isa-sw-demo__editor-bar">
            <Typography variant="subtitle2" className="isa-sw-demo__editor-title" component="h2">
              <SwIcon icon="mdi:file-code-outline" size={18} ns={ns} aria-hidden />
              Constructor IS-Swagger
            </Typography>
            <Box className="isa-sw-demo__editor-actions">
              <Button size="small" variant="contained" onClick={() => handleApply()} startIcon={<SwIcon icon="mdi:play-circle-outline" size={18} ns={ns} />}>
                Aplicar vista
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  try {
                    setSourceText(isDocumentText(JSON.parse(sourceText)));
                    setParseErr("");
                  } catch (e) {
                    setParseErr(e?.message || String(e));
                  }
                }}
              >
                Formatear
              </Button>
              <Tooltip title="Ocultar editor" arrow>
                <IconButton size="small" onClick={() => setEditorOpen(false)} aria-label="Ocultar editor">
                  <SwIcon icon="mdi:chevron-up" size={20} ns={ns} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <IsJsonEditor value={sourceText} onChange={setSourceText} onApply={handleApply} ns={ns} />
          {parseErr ? (
            <Alert severity="error" sx={{ mx: 1.5, mb: 1, py: 0 }} className="isa-sw-demo__parse-err">
              {parseErr}
            </Alert>
          ) : null}
        </Box>
      ) : (
        <Box className="isa-sw-demo__editor-collapsed">
          <Button size="small" variant="outlined" onClick={() => setEditorOpen(true)} startIcon={<SwIcon icon="mdi:file-code-outline" size={18} ns={ns} />}>
            Mostrar editor IS
          </Button>
        </Box>
      )}

      <Box className="isa-sw-demo__preview" component="section" aria-label="Vista previa Swagger">
        {applied ? (
          <SwaggerViewer config={applied.config} spec={applied.spec} />
        ) : (
          <Box className="isa-sw-demo__preview-empty">
            <Typography color="text.secondary">Pega un JSON IS válido y pulsa Aplicar vista.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
