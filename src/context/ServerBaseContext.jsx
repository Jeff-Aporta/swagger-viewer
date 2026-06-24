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

export function ServerBaseProvider({ spec, config, children }) {
  const scopes = useMemo(() => scopesFromConfig(config), [config]);
  const defaultBase = useMemo(() => {
    const fromScopes = scopes[0]?.base;
    if (fromScopes) return normalizeServerBase(fromScopes);
    return inferDefaultServerBase(spec, config);
  }, [spec, config, scopes]);
  const storageKey = useMemo(() => serverBaseStorageKey(config), [config]);

  function resolveInitialBase() {
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
    if (!defaultBase) return;
    setServerBaseState(resolveInitialBase());
  }, [defaultBase, storageKey, scopes]);

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
    <ServerBaseContext.Provider value={{ serverBase, setServerBase, defaultBase, scopes }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
