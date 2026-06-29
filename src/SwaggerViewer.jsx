import { InfoHeader } from "./components/doc/InfoHeader.jsx";
import { OperationTagGroup } from "./components/operations/OperationTagGroup.jsx";
import { ExportToolbar, SwaggerFrontLinks, buildExportFormats } from "./components/toolbar/ExportToolbar.jsx";
import { AuthDialogs } from "./components/dialogs/AuthDialogs.jsx";
import { SwaggerHeaderAuth } from "./components/toolbar/SwaggerHeaderAuth.jsx";
import { SwaggerOpenGhPagesBtn } from "./components/toolbar/SwaggerOpenGhPagesBtn.jsx";
import { SwaggerReloadBtn } from "./components/toolbar/SwaggerReloadBtn.jsx";
import { SwaggerToolbarThemeBtn } from "./components/toolbar/SwaggerToolbarThemeBtn.jsx";
import { ServerHealthBanner } from "./components/server/ServerHealthBanner.jsx";
import { ExpandStackProvider } from "./context/ExpandStackContext.jsx";
import { ServerBaseProvider, useServerBase } from "./context/ServerBaseContext.jsx";
import {
  groupOperationsByTag,
  buildDocIndex,
  buildLookupIndex,
} from "./lib/openapi/openapi.js";
import { getStoredJwt, clearJwt } from "./lib/auth/auth.js";
import { resolveAuthConfig } from "./lib/auth/orchestrator-base.js";
import { applyBrandToDocument, resolveViewerBrand } from "./lib/brand/viewer-brand.js";
import { buildNavRows, filterGroupsByNavTab, activeSectionTabId, resolveInitialNavTab } from "./lib/nav/viewer-nav.js";
import { catalogDocKeysFromSources } from "./lib/openapi/param-enum.js";
import { readNavTabFromUrl, writeNavTabToUrl } from "./lib/nav/nav-url.js";
import { ClientTestTagGroup, readClientTestsFromSpec } from "./components/tester/ClientTestTagGroup.jsx";
import { loadClientTesting, normalizeTests } from "./lib/test/load-client-testing.js";

const { useState, useEffect, useMemo, useCallback } = React;
const { Box, Typography, Alert } = MaterialUI;

function SwaggerReloadBtnWithBase({ onReload, busy, ns }) {
  const { serverBase } = useServerBase();
  return <SwaggerReloadBtn onReload={onReload} busy={busy} ns={ns} serverBase={serverBase} />;
}

export function SwaggerViewer({ config: configProp, spec: specProp, onReload, reloadBusy = false }) {
  const config = useMemo(
    () => (configProp ? { ...configProp, auth: resolveAuthConfig(configProp.auth, configProp.apiBase, configProp) } : configProp),
    [configProp],
  );
  const authEnabled =
    config?.auth?.enabled !== false &&
    (!!config?.auth?.loginUrl ||
      config?.auth?.loginKind === "portal" ||
      String(config?.auth?.loginPath || "").includes("portal-login"));
  const [spec, setSpec] = useState(specProp || null);
  const [mergedConfig, setMergedConfig] = useState(config);
  const [err, setErr] = useState("");
  const [session, setSession] = useState(() => (authEnabled ? getStoredJwt() : null));
  const [navTab, setNavTabState] = useState(() => readNavTabFromUrl());
  const [remoteClientTests, setRemoteClientTests] = useState(null); // tests cargados del server (testing.json)

  const setNavTab = useCallback((tabId) => {
    const id = String(tabId || "").trim();
    setNavTabState(id);
    writeNavTabToUrl(id);
  }, []);

  useEffect(() => {
    function onPopState() {
      setNavTabState(readNavTabFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const urlTab = readNavTabFromUrl();
    const next = resolveInitialNavTab(mergedConfig, session, urlTab);
    setNavTabState((prev) => {
      if (next === prev) return prev;
      if (next !== urlTab) writeNavTabToUrl(next);
      return next;
    });
  }, [mergedConfig, session]);

  useEffect(() => {
    if (specProp) {
      setSpec(specProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadSpec, loadViewerDocument } = await import("./lib/openapi/openapi.js");
        // loadViewerDocument retorna {config, spec} (incluye viewer.client.tests cuando es IS)
        try {
          const vd = await loadViewerDocument(config);
          if (!cancelled) {
            if (vd?.spec) setSpec(vd.spec);
            if (vd?.config) setMergedConfig((prev) => ({ ...prev, ...vd.config }));
          }
        } catch {
          // Fallback al flat spec si la URL no retorna un documento IS válido
          const loaded = await loadSpec(config);
          if (!cancelled) setSpec(loaded);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [specProp, config]);

  // Carga tests agnósticos desde el server (GET /system/testing.json)
  // cuando hay apiBase. Si el server no expone esa ruta o falla, usa fallback embebido.
  const serverBaseCtx = useServerBase();
  const fallbackTests = useMemo(() => readClientTestsFromSpec({ ...mergedConfig, spec }), [mergedConfig, spec]);
  useEffect(() => {
    let cancelled = false;
    const apiBase = serverBaseCtx?.serverBase || mergedConfig?.apiBase || "";
    if (!apiBase) {
      setRemoteClientTests(null);
      return () => { cancelled = true; };
    }
    (async () => {
      const loaded = await loadClientTesting({
        apiBase,
        viewer: { ...mergedConfig, swaggerPaths: serverBaseCtx?.swaggerPaths, testingPath: serverBaseCtx?.testingPath },
        testingPath: serverBaseCtx?.testingPath,
        fallback: fallbackTests,
        getJwt: authEnabled ? () => getStoredJwt()?.token : undefined,
      });
      if (!cancelled) setRemoteClientTests(loaded);
    })();
    return () => { cancelled = true; };
  }, [mergedConfig, authEnabled, fallbackTests, serverBaseCtx]);

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
  const navRows = useMemo(() => buildNavRows(mergedConfig, session, navTab, setNavTab), [mergedConfig, session, navTab]);
  const activeNavTab = useMemo(() => activeSectionTabId(navRows, mergedConfig), [navRows, mergedConfig]);
  const isTestingTab = useMemo(() => {
    if (!activeNavTab) return false;
    const t = String(activeNavTab).toLowerCase();
    return t === "testing" || t === "tests" || t === "test";
  }, [activeNavTab]);
  const visibleGroups = useMemo(() => {
    if (isTestingTab) return [];
    if (!activeNavTab) return groups;
    return filterGroupsByNavTab(groups, mergedConfig, activeNavTab);
  }, [groups, mergedConfig, activeNavTab, isTestingTab]);
  const catalogDocKeys = useMemo(
    () => catalogDocKeysFromSources(spec, mergedConfig?.catalogDocKeys),
    [spec, mergedConfig?.catalogDocKeys],
  );
  const docIndex = useMemo(() => (spec ? buildDocIndex(spec) : {}), [spec]);
  const lookupIndex = useMemo(() => (spec ? buildLookupIndex(spec) : {}), [spec]);
  const clientTests = useMemo(() => {
    if (Array.isArray(remoteClientTests) && remoteClientTests.length) return remoteClientTests;
    return fallbackTests;
  }, [remoteClientTests, fallbackTests]);
  const brand = useMemo(() => resolveViewerBrand(mergedConfig, spec), [mergedConfig, spec]);
  const brandTitle = brand.title;
  const brandIcon = brand.icon;
  const ns = mergedConfig?.ns || "ISA";

  useEffect(() => {
    applyBrandToDocument(brand, { lockMeta: !!(mergedConfig?.brandLock || mergedConfig?.brandLocked) });
  }, [brandTitle, brandIcon, mergedConfig?.brandLock, mergedConfig?.brandLocked]);

  useEffect(() => {
    if (!authEnabled) return;
    const saved = getStoredJwt();
    if (saved?.token) setSession(saved);
  }, [authEnabled]);

  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const embed = mergedConfig?.embed === true;
  const useShell = mergedConfig?.shell !== false && Shell && !embed;
  const externalAuth = mergedConfig?.authUi === "external";
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

  const exportFormats = useMemo(() => {
    const exp = config?.exports;
    const hasIs = !!(exp?.isGetDocument || (spec && config));
    return buildExportFormats(exp, { hasIs, spec, viewerConfig: config });
  }, [config, spec]);

  const authToolbarEnd = authEnabled ? (
    <SwaggerHeaderAuth
      enabled={authEnabled}
      session={session}
      ns={ns}
      exportFormats={exportFormats}
      onLogin={() => globalThis.__isaSwaggerAuth?.openLogin?.()}
      onLogout={() => {
        clearJwt();
        globalThis.__isaSwaggerAuth?.clear?.();
        onSessionChange(null);
      }}
    />
  ) : null;

  const shellToolbarEnd = (
    <Box className="isa-sw-toolbar-tools" sx={{ display: "inline-flex", alignItems: "center", gap: { xs: 1.75, sm: 2.25 }, flexShrink: 0, minWidth: 0 }}>
      <SwaggerFrontLinks frontLinks={config?.frontLinks || []} brandIcon={brandIcon} ns={ns} dense />
      <SwaggerReloadBtnWithBase onReload={onReload} busy={reloadBusy} ns={ns} />
      <SwaggerOpenGhPagesBtn config={config} ns={ns} />
      {authToolbarEnd}
      <SwaggerToolbarThemeBtn ns={ns} />
    </Box>
  );

  const exportToolbarBody = !useShell && spec ? (
    <ExportToolbar frontLinks={config?.frontLinks || []} ns={ns} brandIcon={brandIcon} docked={embed} toolbarEnd={authToolbarEnd} />
  ) : null;

  const viewerBody = (
    <Box className="isa-sw-viewer" sx={{ p: shellLayout ? { xs: 1.5, sm: 2 } : 2, maxWidth: 1160, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {err ? <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert> : null}
      {spec ? (
        <>
          {exportToolbarBody}
          <ServerHealthBanner ns={ns} />
          {!shellLayout ? <InfoHeader spec={spec} showTitle ns={ns} /> : null}
          {clientTests.length > 0 ? (
            <ClientTestTagGroup
              tests={clientTests}
              tagIndex={0}
              authEnabled={authEnabled}
              onNeedLogin={onNeedLogin}
              ns={ns}
              autoExpandFirst={isTestingTab}
            />
          ) : null}
          {visibleGroups.map((group, tagIndex) => (
            <OperationTagGroup
              key={group.name}
              tagIndex={tagIndex + (clientTests.length > 0 ? 1 : 0)}
              group={group}
              spec={spec}
              docIndex={docIndex}
              lookupIndex={lookupIndex}
              catalogDocKeys={catalogDocKeys}
              authEnabled={authEnabled}
              onNeedLogin={onNeedLogin}
              ns={ns}
            />
          ))}
          {isTestingTab && clientTests.length === 0 ? (
            <Box className="isa-sw-testing-empty" sx={{ mt: 4, p: 3, textAlign: "center", borderRadius: 2, border: "1px dashed", borderColor: "divider", color: "text.secondary" }}>
              <Typography variant="body2">
                Esta sección está reservada para tests agnósticos. Agrega un <code>viewer.client.tests[]</code> en
                <code>is-swagger.json</code> y recarga.
              </Typography>
            </Box>
          ) : null}
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
          appId={config?.auth?.app}
          onSessionChange={onSessionChange}
          ns={ns}
        />
      ) : null}
    </Box>
  );

  const framed = useShell ? (
    <Shell
      ns={mergedConfig.ns || "ISA"}
      title={brandTitle}
      icon={brandIcon}
      showTarget={false}
      showTheme={false}
      bodyScroll
      navRows={navRows}
      toolbarEnd={shellToolbarEnd}
    >
      <Box className="isa-sw-shell" sx={{ width: "100%" }}>{viewerBody}</Box>
    </Shell>
  ) : (
    <Box className={shellLayout ? "isa-sw-shell" : undefined} sx={shellLayout ? { width: "100%" } : undefined}>{viewerBody}</Box>
  );

  return (
    <ServerBaseProvider spec={spec} config={config}>
      <ExpandStackProvider>{framed}</ExpandStackProvider>
    </ServerBaseProvider>
  );
}
