import { SwIcon } from "../../../src/lib/ui/sw-icon.jsx";

const { useEffect, useRef, useState } = React;
const { Box, Typography } = MaterialUI;

function resolveCmTheme() {
  const scheme = document.documentElement.getAttribute("data-mui-color-scheme");
  return scheme === "light" ? "default" : "dracula";
}

function isEventInCodeMirror(cm, target) {
  const root = cm?.getWrapperElement?.();
  if (!root) return false;
  const el = target ?? document.activeElement;
  return !!(el && root.contains(el));
}

/** addKeyMap: el pin front-shared@a5a6597 no fusiona extraKeys ni define Ctrl-A. */
function attachEditorKeyMaps(cm, onApplyRef) {
  if (!cm?.addKeyMap) return;
  cm.addKeyMap({
    "Ctrl-A": () => cm.execCommand("selectAll"),
    "Cmd-A": () => cm.execCommand("selectAll"),
    "Ctrl-Enter": () => onApplyRef.current?.(cm.getValue?.() ?? ""),
    "Cmd-Enter": () => onApplyRef.current?.(cm.getValue?.() ?? ""),
  });
}

/** Editor JSON (CodeMirror) para documentos insoft.swagger-viewer. */
export function IsJsonEditor({ value, onChange, onApply, getTextRef, active, ns = "ISA" }) {
  const hostRef = useRef(null);
  const cmRef = useRef(null);
  const onApplyRef = useRef(onApply);
  const [cmReady, setCmReady] = useState(false);
  onApplyRef.current = onApply;

  useEffect(() => {
    if (!active || !cmRef.current) return;
    cmRef.current.focus();
  }, [active]);

  useEffect(() => {
    if (getTextRef) {
      getTextRef.current = () => cmRef.current?.getValue?.() ?? value ?? "";
    }
  }, [getTextRef, value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof globalThis.ISAFront?.ensureCodeMirrorLoaded === "function") {
        await globalThis.ISAFront.ensureCodeMirrorLoaded({ sql: false });
      }
      if (cancelled || !hostRef.current || !globalThis.ISAFront?.mountCodeMirror) return;
      cmRef.current = globalThis.ISAFront.mountCodeMirror(hostRef.current, {
        value: value || "",
        json: true,
        lineWrapping: false,
        theme: resolveCmTheme(),
        onChange: (text) => onChange?.(text),
      });
      attachEditorKeyMaps(cmRef.current, onApplyRef);
      if (getTextRef) {
        getTextRef.current = () => cmRef.current?.getValue?.() ?? value ?? "";
      }
      setCmReady(true);
    })();
    return () => {
      cancelled = true;
      setCmReady(false);
      try {
        cmRef.current?.toTextArea?.();
      } catch {
        /* ignore */
      }
      cmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cm = cmRef.current;
    if (!cm || cm.getValue() === value) return;
    const scroll = cm.getScrollInfo();
    const cursor = cm.getCursor();
    cm.setValue(value || "");
    cm.scrollTo(scroll.left, scroll.top);
    cm.setCursor(cursor);
  }, [value]);

  useEffect(() => {
    if (!active || !cmReady) return undefined;
    const cm = cmRef.current;
    if (!cm) return undefined;

    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "a") return;
      if (!isEventInCodeMirror(cm, e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      cm.execCommand("selectAll");
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [active, cmReady]);

  useEffect(() => {
    if (!cmReady) return undefined;
    function applyTheme() {
      const cm = cmRef.current;
      if (!cm?.setOption) return;
      const next = resolveCmTheme();
      if (cm.getOption("theme") !== next) {
        cm.setOption("theme", next);
        cm.refresh();
      }
    }
    applyTheme();
    const obs = new MutationObserver(applyTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mui-color-scheme"] });
    return () => obs.disconnect();
  }, [cmReady]);

  return (
    <Box className="isa-sw-demo__cm-wrap" sx={{ borderTop: 1, borderColor: "divider" }}>
      <Box ref={hostRef} className="isa-sw-demo__cm-host isa-cm-host" aria-label="Editor JSON IS" />
      <Typography component="p" variant="caption" color="text.secondary" className="isa-sw-demo__cm-hint">
        <SwIcon icon="mdi:keyboard" size={14} ns={ns} aria-hidden />
        Ctrl+Enter aplica · Ctrl+A selecciona todo
      </Typography>
    </Box>
  );
}
