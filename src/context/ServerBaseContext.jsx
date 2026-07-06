import { inferDefaultServerBase } from "../lib/lookup/server-base.js";

const { createContext, useContext, useMemo } = React;

const ServerBaseContext = createContext({
  serverBase: "",
  defaultBase: "",
  swaggerPaths: null,
  healthPath: "/info",
  testingPath: "/system/testing.json",
});

/** Base API inferida del spec/config — sin editor en UI. */
export function ServerBaseProvider({ spec, config, children }) {
  const serverBase = useMemo(() => inferDefaultServerBase(spec, config), [spec, config]);
  const swaggerPaths = config?.swaggerPaths ?? null;
  const healthPath = swaggerPaths?.health || "/info";
  const testingPath = swaggerPaths?.testing || config?.testingPath || "/system/testing.json";
  return (
    <ServerBaseContext.Provider value={{ serverBase, defaultBase: serverBase, swaggerPaths, healthPath, testingPath }}>
      {children}
    </ServerBaseContext.Provider>
  );
}

export function useServerBase() {
  return useContext(ServerBaseContext);
}
