import { inferDefaultServerBase } from "../lib/lookup/server-base.js";

const { createContext, useContext, useMemo } = React;

const ServerBaseContext = createContext({
  serverBase: "",
  defaultBase: "",
});

/** Base API inferida del spec/config — sin editor en UI. */
export function ServerBaseProvider({ spec, config, children }) {
  const serverBase = useMemo(() => inferDefaultServerBase(spec, config), [spec, config]);
  return (
    <ServerBaseContext.Provider value={{ serverBase, defaultBase: serverBase }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
