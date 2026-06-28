/** Re-render cuando cambia html[data-mui-color-scheme] (toggle tema AppShell). */

const { useState, useEffect } = React;

export function readMuiColorScheme() {
  if (typeof document === "undefined") return "dark";
  const scheme = document.documentElement.getAttribute("data-mui-color-scheme");
  return scheme === "light" ? "light" : "dark";
}

export function useMuiColorScheme() {
  const [scheme, setScheme] = useState(readMuiColorScheme);

  useEffect(() => {
    function sync() {
      setScheme(readMuiColorScheme());
    }
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mui-color-scheme"] });
    return () => obs.disconnect();
  }, []);

  return scheme;
}
