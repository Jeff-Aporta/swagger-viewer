import { joinApiUrl } from "../lib/server-base.js";
import { useServerBase } from "../context/ServerBaseContext.jsx";
import { fetchApiJson } from "../lib/api-fetch.js";
import { HttpErrorAlert } from "./HttpErrorAlert.jsx";

const { useState, useEffect } = React;

export function ServerHealthBanner({ ns = "ISA" }) {
  const { serverBase } = useServerBase();
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!serverBase) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchApiJson(joinApiUrl(serverBase, "/health"), { auth: false });
        if (cancelled) return;
        const db = data?.respuesta?.datos?.database;
        if (db && db.bconnected === false) {
          setState({
            severity: "warning",
            message: [
              "La API responde pero no hay conexión a SQL Server.",
              db.database ? `Base: ${db.database}.` : "",
              "Los endpoints de conversaciones y lookups fallarán hasta que MSSQL esté accesible (VPN, red, credenciales en local.settings.json).",
              "Verifica GET /health → respuesta.datos.database.bconnected = true.",
            ]
              .filter(Boolean)
              .join("\n"),
          });
        } else {
          setState(null);
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            severity: "error",
            message: [
              "No se pudo consultar el estado de la API.",
              e.message || String(e),
            ].join("\n"),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverBase]);

  if (!state) return null;
  return (
    <HttpErrorAlert
      severity={state.severity}
      message={state.message}
      sx={{ mb: 1.5, mx: { xs: 0, sm: 0 } }}
    />
  );
}
