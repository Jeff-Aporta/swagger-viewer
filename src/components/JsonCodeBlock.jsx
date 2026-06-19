const { useEffect, useRef } = React;
const { Box } = MaterialUI;

export function JsonCodeBlock({ value, minHeight = "6rem", readOnly = true }) {
  const hostRef = useRef(null);
  const Panel = globalThis.ISAFront?.CodeMirrorPanel;

  useEffect(() => {
    if (Panel || !hostRef.current) return;
    const cm = globalThis.ISAFront?.mountCodeMirror;
    if (!cm) return;
    const el = hostRef.current;
    el.innerHTML = "";
    const inst = cm(el, {
      value: value || "",
      json: true,
      readOnly: readOnly ? "nocursor" : false,
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity,
    });
    return () => {
      if (inst?.getWrapperElement) {
        const w = inst.getWrapperElement();
        if (w?.parentNode) w.parentNode.removeChild(w);
      }
    };
  }, [Panel, value, readOnly]);

  if (Panel) {
    return (
      <Box className="isa-sw-json-block" sx={{ border: 1, borderColor: "divider", borderRadius: "0.5rem", overflow: "hidden" }}>
        <Panel value={value || ""} readOnly={readOnly} json lineWrapping minHeight={minHeight} />
      </Box>
    );
  }

  return (
    <Box ref={hostRef} className="isa-sw-json-block" sx={{ minHeight }} />
  );
}
