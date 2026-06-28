import { resolveCodeMirrorTheme } from "../../../../front-shared/cdn/isa/js/ui/code-mirror.js";

const { useEffect, useRef, useMemo } = React;
const { Box, IconButton, Tooltip } = MaterialUI;

const JSON_BLOCK_MAX_HEIGHT = "80vh";

export function JsonCodeBlock({
  value,
  minHeight,
  maxHeight = JSON_BLOCK_MAX_HEIGHT,
  readOnly = true,
  onChange,
  disabled = false,
  placeholder = "",
  className = "",
  onClear,
  clearTitle = "Borrar",
}) {
  const hostRef = useRef(null);
  const cmRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const Panel = globalThis.ISAFront?.CodeMirrorPanel;
  const isReadOnly = readOnly || disabled;
  const editable = !isReadOnly && typeof onChange === "function";
  const resolvedMinHeight = minHeight ?? (isReadOnly ? "0" : "6rem");
  const toolbarExtra = useMemo(() => {
    if (!onClear || !Panel) return null;
    return (
      <Tooltip title={clearTitle}>
        <IconButton size="small" className="isa-cm-panel__fab isa-cm-panel__clear" aria-label={clearTitle} onClick={onClear}>
          <iconify-icon icon="mdi:delete-outline" width="14" height="14" />
        </IconButton>
      </Tooltip>
    );
  }, [onClear, clearTitle, Panel]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (Panel || !hostRef.current) return;
    const mount = globalThis.ISAFront?.mountCodeMirror;
    if (!mount) return;
    const el = hostRef.current;
    el.innerHTML = "";
    const inst = mount(el, {
      value: value || "",
      json: true,
      readOnly: isReadOnly ? "nocursor" : false,
      lineNumbers: true,
      lineWrapping: false,
      viewportMargin: isReadOnly ? Infinity : 10,
      onChange: editable ? (text) => onChangeRef.current?.(text) : undefined,
    });
    cmRef.current = inst;
    function applyTheme() {
      const cm = cmRef.current;
      if (!cm?.setOption) return;
      const next = resolveCodeMirrorTheme();
      if (cm.getOption("theme") !== next) {
        cm.setOption("theme", next);
        cm.refresh();
      }
    }
    applyTheme();
    const obs = new MutationObserver(applyTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mui-color-scheme"] });
    return () => {
      obs.disconnect();
      cmRef.current = null;
      if (inst?.getWrapperElement) {
        const w = inst.getWrapperElement();
        if (w?.parentNode) w.parentNode.removeChild(w);
      }
    };
  }, [Panel, isReadOnly, editable]);

  useEffect(() => {
    if (Panel) return;
    const cm = cmRef.current;
    if (!cm) return;
    const next = value ?? "";
    if (cm.getValue() === next) return;
    const scroll = cm.getScrollInfo();
    const cursor = cm.getCursor();
    cm.setValue(next);
    cm.scrollTo(scroll.left, scroll.top);
    if (!isReadOnly) cm.setCursor(cursor);
  }, [Panel, value, isReadOnly]);

  if (Panel) {
    return (
      <Box className={`isa-sw-json-block ${className}`.trim()} sx={{ border: 1, borderColor: "divider", borderRadius: "0.5rem", overflow: "hidden", maxHeight, minHeight: 0 }}>
        <Panel
          value={value || ""}
          readOnly={isReadOnly}
          onChange={editable ? (text) => onChangeRef.current?.(text) : undefined}
          json
          lineWrapping={false}
          lineNumbers
          minHeight={resolvedMinHeight}
          maxHeight={maxHeight}
          placeholder={placeholder}
          toolbarExtra={toolbarExtra}
        />
      </Box>
    );
  }

  return (
    <Box ref={hostRef} className={`isa-sw-json-block ${className}`.trim()} sx={{ minHeight: resolvedMinHeight, maxHeight, overflow: "hidden", border: 1, borderColor: "divider", borderRadius: "0.5rem" }} />
  );
}

