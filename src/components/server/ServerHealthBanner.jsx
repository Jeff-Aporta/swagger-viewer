import { joinApiUrl } from "../../lib/lookup/server-base.js";
import { useServerBase } from "../../context/ServerBaseContext.jsx";
import { fetchApiJson } from "../../lib/http/api-fetch.js";
import { HttpErrorAlert } from "../try-it-out/HttpErrorAlert.jsx";

const { useState, useEffect } = React;

const RETRY_MS = 3000;

function mssqlWarningMessage(db) {
  return [
    "La API responde pero no hay conexión a SQL Server.",
    db.database ? `Base: ${db.database}.` : "",
    "Los endpoints de conversaciones y lookups fallarán hasta que MSSQL esté accesible (VPN, red, credenciales en local.settings.json).",
  ]
    .filter(Boolean)
    .join(" ");
}

export function ServerHealthBanner({ ns = "ISA" }) {
  const { serverBase } = useServerBase();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!serverBase) return;
    let cancelled = false;
    let retryTimer = null;

    async function check() {
      if (cancelled) return;
      try {
        const { data } = await fetchApiJson(joinApiUrl(serverBase, "/health"), { auth: false });
        if (cancelled) return;
        const db = data?.respuesta?.datos?.database;
        if (db?.bconnected === false) {
          setMessage(mssqlWarningMessage(db));
          retryTimer = setTimeout(check, RETRY_MS);
        } else {
          setMessage(null);
        }
      } catch {
        if (!cancelled) setMessage(null);
      }
    }

    check();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [serverBase]);

  if (!message) return null;
  return (
    <HttpErrorAlert
      severity="warning"
      message={message}
      sx={{ mb: 1.5, mx: { xs: 0, sm: 0 } }}
    />
  );
}
