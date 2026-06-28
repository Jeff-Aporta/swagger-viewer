const { useEffect, useRef } = React;
const { Box } = MaterialUI;

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
}) {
  const hostRef = useRef(null);
  const cmRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const Panel = globalThis.ISAFront?.CodeMirrorPanel;
  const isReadOnly = readOnly || disabled;
  const editable = !isReadOnly && typeof onChange === "function";
  const resolvedMinHeight = minHeight ?? (isReadOnly ? "0" : "6rem");

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
    return () => {
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
        />
      </Box>
    );
  }

  return (
    <Box ref={hostRef} className={`isa-sw-json-block ${className}`.trim()} sx={{ minHeight: resolvedMinHeight, maxHeight, overflow: "hidden", border: 1, borderColor: "divider", borderRadius: "0.5rem" }} />
  );
}

