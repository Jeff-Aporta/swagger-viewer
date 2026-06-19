import { InfoHeader } from "./components/InfoHeader.jsx";
import { OperationTagGroup } from "./components/OperationTagGroup.jsx";
import { ExportToolbar } from "./components/ExportToolbar.jsx";
import { AuthDialogs } from "./components/AuthDialogs.jsx";
import { SwaggerHeaderAuth } from "./components/SwaggerHeaderAuth.jsx";
import { ExpandStackProvider } from "./context/ExpandStackContext.jsx";
import {
  groupOperationsByTag,
  buildDocIndex,
  buildLookupIndex,
} from "./lib/openapi.js";
import { getStoredJwt, clearJwt, formatLocalDateTime } from "./lib/auth.js";

const { useState, useEffect, useMemo } = React;
const { Box, Typography, Alert } = MaterialUI;

const API_TAB = { id: "api", label: "API", icon: "mdi:api" };

export function SwaggerViewer({ config, spec: specProp }) {
  const authEnabled = config?.auth?.enabled !== false && !!config?.auth?.loginUrl;
  const [spec, setSpec] = useState(specProp || null);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState({ message: "", tone: "" });
  const [session, setSession] = useState(() => (authEnabled ? getStoredJwt() : null));

  useEffect(() => {
    if (specProp) {
      setSpec(specProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadSpec } = await import("./lib/openapi.js");
        const loaded = await loadSpec(config);
        if (!cancelled) setSpec(loaded);
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [specProp, config]);

  const groups = useMemo(() => {
    if (!spec) return [];
    const grouped = groupOperationsByTag(spec);
    const order = (spec.tags || []).map((t) => t.name);
    return grouped.sort((a, b) => {
      const ia = order.indexOf(a.name);
      const ib = order.indexOf(b.name);
      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [spec]);
  const docIndex = useMemo(() => (spec ? buildDocIndex(spec) : {}), [spec]);
  const lookupIndex = useMemo(() => (spec ? buildLookupIndex(spec) : {}), [spec]);

  useEffect(() => {
    if (!authEnabled) return;
    const saved = getStoredJwt();
    if (saved?.token) {
      setSession(saved);
      setStatus({
        message:
          `Sesión restaurada${saved.username ? ` (${saved.username})` : ""}` +
          (saved.expiresAt ? ` · expira ${formatLocalDateTime(saved.expiresAt)}` : ""),
        tone: "ok",
      });
    }
  }, [authEnabled]);

  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const useShell = config?.shell !== false && Shell;
  const brandTitle = config?.brand?.title;
  const brandIcon = config?.brand?.icon;
  const ns = config?.ns || "ISA";

  function onNeedLogin(hint) {
    globalThis.__isaSwaggerAuth?.openLogin?.(hint);
    setStatus({ message: hint, tone: "warn" });
  }

  function onSessionChange(s) {
    if (!s) {
      clearJwt();
      setSession(null);
      setStatus({ message: "", tone: "" });
      return;
    }
    setSession(getStoredJwt());
    setStatus({ message: s.message || "", tone: s.message ? "ok" : "" });
  }

  const body = (
    <ExpandStackProvider>
      <Box
        className={useShell ? "isa-sw-shell" : undefined}
        sx={
          useShell
            ? { width: "100%", minHeight: "100%", display: "flex", flexDirection: "column" }
            : undefined
        }
      >
        {spec ? (
          <ExportToolbar
            exports={config?.exports}
            frontLinks={config?.frontLinks || []}
            status={status}
            ns={ns}
            docked={useShell}
          />
        ) : null}
        <Box
          className="isa-sw-viewer"
          sx={{
            p: useShell ? { xs: 1.5, sm: 2 } : 2,
            maxWidth: 1160,
            mx: "auto",
            width: "100%",
            boxSizing: "border-box",
            flex: useShell ? 1 : undefined,
          }}
        >
      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}
      {spec ? (
        <>
          <InfoHeader spec={spec} showTitle={!useShell} ns={ns} />
          {groups.map((group, tagIndex) => (
            <OperationTagGroup
              key={group.name}
              tagIndex={tagIndex}
              group={group}
              spec={spec}
              docIndex={docIndex}
              lookupIndex={lookupIndex}
              authEnabled={authEnabled}
              onNeedLogin={onNeedLogin}
              ns={ns}
            />
          ))}
        </>
      ) : !err ? (
        <Typography color="text.secondary">Cargando especificación OpenAPI…</Typography>
      ) : null}
      <AuthDialogs
        enabled={authEnabled}
        authBase={config?.auth?.loginUrl}
        onSessionChange={onSessionChange}
        ns={ns}
      />
        </Box>
      </Box>
    </ExpandStackProvider>
  );

  if (!useShell) return body;

  return (
    <Shell
      ns={config.ns || "ISA"}
      title={brandTitle}
      icon={brandIcon}
      showTarget={false}
      bodyScroll
      navRows={[
        {
          id: "api",
          value: API_TAB.id,
          onChange: () => {},
          tabs: [API_TAB],
        },
      ]}
      toolbarEnd={
        authEnabled ? (
          <SwaggerHeaderAuth
            enabled={authEnabled}
            session={session}
            ns={ns}
            onLogin={() => globalThis.__isaSwaggerAuth?.openLogin?.()}
            onJwt={() => globalThis.__isaSwaggerAuth?.openJwt?.()}
            onLogout={() => {
              clearJwt();
              globalThis.__isaSwaggerAuth?.clear?.();
              onSessionChange(null);
            }}
          />
        ) : null
      }
    >
      {body}
    </Shell>
  );
}
