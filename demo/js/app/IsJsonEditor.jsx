import { SwIcon } from "../../../src/lib/sw-icon.jsx";

const { useEffect, useRef } = React;

/** Editor JSON (CodeMirror) para documentos insoft.swagger-viewer. */
export function IsJsonEditor({ value, onChange, onApply, ns = "ISA" }) {
  const hostRef = useRef(null);
  const cmRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const onApplyRef = { current: onApply };
    onApplyRef.current = onApply;
    (async () => {
      if (typeof globalThis.ISAFront?.ensureCodeMirrorLoaded === "function") {
        await globalThis.ISAFront.ensureCodeMirrorLoaded({ sql: false });
      }
      if (cancelled || !hostRef.current || !globalThis.ISAFront?.mountCodeMirror) return;
      cmRef.current = globalThis.ISAFront.mountCodeMirror(hostRef.current, {
        value: value || "",
        json: true,
        lineWrapping: false,
        onChange: (text) => onChange?.(text),
        extraKeys: {
          "Ctrl-Enter": () => onApplyRef.current?.(cmRef.current?.getValue?.() ?? ""),
          "Cmd-Enter": () => onApplyRef.current?.(cmRef.current?.getValue?.() ?? ""),
        },
      });
    })();
    return () => {
      cancelled = true;
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

  return (
    <div className="isa-sw-demo__cm-wrap">
      <div ref={hostRef} className="isa-sw-demo__cm-host isa-cm-host" aria-label="Editor JSON IS" />
      <p className="isa-sw-demo__cm-hint">
        <SwIcon icon="mdi:keyboard" size={14} ns={ns} aria-hidden />
        Ctrl+Enter aplica la vista
      </p>
    </div>
  );
}
