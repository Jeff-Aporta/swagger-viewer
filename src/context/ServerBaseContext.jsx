import {
  inferDefaultServerBase,
  normalizeServerBase,
  serverBaseStorageKey,
} from "../lib/server-base.js";

const { createContext, useContext, useState, useEffect, useMemo } = React;

const ServerBaseContext = createContext({
  serverBase: "",
  setServerBase: () => {},
  defaultBase: "",
});

export function ServerBaseProvider({ spec, config, children }) {
  const defaultBase = useMemo(() => inferDefaultServerBase(spec, config), [spec, config]);
  const storageKey = useMemo(() => serverBaseStorageKey(config), [config]);
  const [serverBase, setServerBaseState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) return normalizeServerBase(saved);
    } catch {
      /* ignore */
    }
    return defaultBase;
  });

  useEffect(() => {
    if (!defaultBase) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        setServerBaseState(normalizeServerBase(saved));
        return;
      }
    } catch {
      /* ignore */
    }
    setServerBaseState(defaultBase);
  }, [defaultBase, storageKey]);

  function setServerBase(value) {
    const next = normalizeServerBase(value);
    setServerBaseState(next);
    try {
      if (next) sessionStorage.setItem(storageKey, next);
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  return (
    <ServerBaseContext.Provider value={{ serverBase, setServerBase, defaultBase }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
