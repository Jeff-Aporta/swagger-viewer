import {
  inferDefaultServerBase,
  normalizeServerBase,
  serverBaseStorageKey,
} from "../lib/lookup/server-base.js";
import { scopesFromConfig, matchScope } from "../lib/lookup/server-scopes.js";

const { createContext, useContext, useState, useEffect, useMemo } = React;

const ServerBaseContext = createContext({
  serverBase: "",
  setServerBase: () => {},
  defaultBase: "",
  scopes: [],
});

export function ServerBaseProvider({ spec, config, children, fixed = false }) {
  const scopes = useMemo(() => scopesFromConfig(config), [config]);
  const defaultBase = useMemo(() => inferDefaultServerBase(spec, config), [spec, config]);
  const storageKey = useMemo(() => serverBaseStorageKey(config), [config]);

  function resolveInitialBase() {
    if (fixed) return defaultBase;
    try {
      const saved = normalizeServerBase(sessionStorage.getItem(storageKey) || "");
      if (saved) {
        if (scopes.length && !matchScope(scopes, saved)) return defaultBase;
        return saved;
      }
    } catch {
      /* ignore */
    }
    return defaultBase;
  }

  const [serverBase, setServerBaseState] = useState(resolveInitialBase);

  useEffect(() => {
    if (fixed || !defaultBase) return;
    setServerBaseState(resolveInitialBase());
  }, [defaultBase, storageKey, scopes, fixed]);

  function setServerBase(value) {
    if (fixed) return;
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
    <ServerBaseContext.Provider value={{ serverBase, setServerBase, defaultBase, scopes, fixed }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
