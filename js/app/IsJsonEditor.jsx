import { SwIcon } from "../../../src/lib/sw-icon.jsx";
import { useGlassColors } from "../../../src/lib/glass.jsx";

const { useEffect, useRef, useState } = React;
const { Box, Typography } = MaterialUI;

function resolveCmTheme() {
  const scheme = document.documentElement.getAttribute("data-mui-color-scheme");
  return scheme === "light" ? "default" : "dracula";
}

/** Editor JSON (CodeMirror) para documentos insoft.swagger-viewer. */
export function IsJsonEditor({ value, onChange, onApply, getTextRef, active, ns = "ISA" }) {
  const c = useGlassColors();
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
        extraKeys: {
          "Ctrl-Enter"() {
            onApplyRef.current?.(cmRef.current?.getValue?.() ?? "");
          },
          "Cmd-Enter"() {
            onApplyRef.current?.(cmRef.current?.getValue?.() ?? "");
          },
        },
      });
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
    <Box
      className="isa-sw-demo__cm-wrap"
      sx={{
        bgcolor: c.preBg,
        borderTop: 1,
        borderColor: c.border,
      }}
    >
      <Box ref={hostRef} className="isa-sw-demo__cm-host isa-cm-host" aria-label="Editor JSON IS" />
      <Typography component="p" variant="caption" className="isa-sw-demo__cm-hint" sx={{ color: c.muted, borderColor: c.border }}>
        <SwIcon icon="mdi:keyboard" size={14} ns={ns} aria-hidden />
        Ctrl+Enter aplica · Ctrl+A selecciona todo
      </Typography>
    </Box>
  );
}
