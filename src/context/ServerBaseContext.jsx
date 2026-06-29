import { inferDefaultServerBase } from "../lib/lookup/server-base.js";

const { createContext, useContext, useMemo } = React;

const ServerBaseContext = createContext({
  serverBase: "",
  defaultBase: "",
  swaggerPaths: null,
  healthPath: "/system/health",
});

/** Base API inferida del spec/config — sin editor en UI. */
export function ServerBaseProvider({ spec, config, children }) {
  const serverBase = useMemo(() => inferDefaultServerBase(spec, config), [spec, config]);
  const swaggerPaths = config?.swaggerPaths ?? null;
  const healthPath = swaggerPaths?.health || "/system/health";
  return (
    <ServerBaseContext.Provider value={{ serverBase, defaultBase: serverBase, swaggerPaths, healthPath }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
