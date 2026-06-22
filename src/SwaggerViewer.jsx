import { InfoHeader } from "./components/InfoHeader.jsx";
import { OperationTagGroup } from "./components/OperationTagGroup.jsx";
import { ExportToolbar } from "./components/ExportToolbar.jsx";
import { AuthDialogs } from "./components/AuthDialogs.jsx";
import { SwaggerHeaderAuth } from "./components/SwaggerHeaderAuth.jsx";
import { ServerHealthBanner } from "./components/ServerHealthBanner.jsx";
import { ExpandStackProvider } from "./context/ExpandStackContext.jsx";
import { ServerBaseProvider } from "./context/ServerBaseContext.jsx";
import {
  groupOperationsByTag,
  buildDocIndex,
  buildLookupIndex,
} from "./lib/openapi/openapi.js";
import { getStoredJwt, clearJwt } from "./lib/auth/auth.js";
import { applyBrandToDocument, resolveViewerBrand } from "./lib/brand/viewer-brand.js";

const { useState, useEffect, useMemo } = React;
const { Box, Typography, Alert } = MaterialUI;

const API_TAB = { id: "api", label: "API", icon: "mdi:api" };

export function SwaggerViewer({ config, spec: specProp }) {
  const authEnabled =
    config?.auth?.enabled !== false &&
    (!!config?.auth?.loginUrl ||
      config?.auth?.loginKind === "portal" ||
      String(config?.auth?.loginPath || "").includes("portal-login"));
  const [spec, setSpec] = useState(specProp || null);
  const [err, setErr] = useState("");
  const [session, setSession] = useState(() => (authEnabled ? getStoredJwt() : null));

  useEffect(() => {
    if (specProp) {
      setSpec(specProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadSpec } = await import("./lib/openapi/openapi.js");
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
  const brand = useMemo(() => resolveViewerBrand(config, spec), [config, spec]);
  const brandTitle = brand.title;
  const brandIcon = brand.icon;
  const ns = config?.ns || "ISA";

  useEffect(() => {
    applyBrandToDocument(brand);
  }, [brandTitle, brandIcon]);

  useEffect(() => {
    if (!authEnabled) return;
    const saved = getStoredJwt();
    if (saved?.token) setSession(saved);
  }, [authEnabled]);

  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const embed = config?.embed === true;
  const useShell = config?.shell !== false && Shell && !embed;
  const externalAuth = config?.authUi === "external";
  const dockedToolbar = useShell || embed;
  const shellLayout = useShell || embed;

  function onNeedLogin(hint) {
    globalThis.__isaSwaggerAuth?.openLogin?.(hint);
  }

  function onSessionChange(s) {
    if (!s) {
      clearJwt();
      setSession(null);
      return;
    }
    setSession(getStoredJwt());
  }

  const body = (
    <ServerBaseProvider spec={spec} config={config}>
      <ExpandStackProvider>
      <Box
        className={shellLayout ? "isa-sw-shell" : undefined}
        sx={shellLayout ? { width: "100%" } : undefined}
      >
        <Box
          className="isa-sw-viewer"
          sx={{
            p: shellLayout ? { xs: 1.5, sm: 2 } : 2,
            maxWidth: 1160,
            mx: "auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {err ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          ) : null}
          {spec ? (
            <>
              {dockedToolbar ? (
                <Box
                  className="isa-sw-toolbar-bleed"
                  sx={{
                    mx: { xs: -1.5, sm: -2 },
                    width: { xs: "calc(100% + 24px)", sm: "calc(100% + 32px)" },
                    mb: 0,
                  }}
                >
                  <ExportToolbar
                    exports={config?.exports}
                    frontLinks={config?.frontLinks || []}
                    ns={ns}
                    brandIcon={brandIcon}
                    viewerConfig={config}
                    spec={spec}
                    showServer
                    docked
                  />
                </Box>
              ) : (
                <ExportToolbar
                  exports={config?.exports}
                  frontLinks={config?.frontLinks || []}
                  ns={ns}
                  brandIcon={brandIcon}
                  viewerConfig={config}
                  spec={spec}
                  showServer
                  docked={false}
                />
              )}
              <ServerHealthBanner ns={ns} />
              <InfoHeader spec={spec} showTitle={!shellLayout} ns={ns} />
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
          {!externalAuth ? (
            <AuthDialogs
              enabled={authEnabled}
              authBase={config?.auth?.loginUrl}
              authKind={config?.auth?.loginKind}
              loginPath={config?.auth?.loginPath}
              onSessionChange={onSessionChange}
              ns={ns}
            />
          ) : null}
        </Box>
      </Box>
      </ExpandStackProvider>
    </ServerBaseProvider>
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
