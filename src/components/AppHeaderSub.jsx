const { useState, useEffect } = React;

/** Ancla contenido compacto bajo nav secundaria del AppShell. */
export function AppHeaderSub({ children }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    if (!children) return undefined;
    let node = null;
    let cancelled = false;

    function attach() {
      const header = document.querySelector(".isa-layout-root > header.MuiAppBar-root");
      if (!header) return false;
      node = header.querySelector(".isa-sw-header-sub-host");
      if (!node) {
        node = document.createElement("div");
        node.className = "isa-header-sub isa-sw-header-sub-host";
        header.appendChild(node);
      }
      setHost(node);
      return true;
    }

    if (!attach()) {
      const obs = new MutationObserver(() => {
        if (!cancelled && attach()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return () => {
        cancelled = true;
        obs.disconnect();
        node?.remove();
        setHost(null);
      };
    }

    return () => {
      cancelled = true;
      node?.remove();
      setHost(null);
    };
  }, [children]);

  if (!host || !children) return null;
  return ReactDOM.createPortal(children, host);
}
