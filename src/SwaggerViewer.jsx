import { InfoHeader } from "./components/InfoHeader.jsx";
import { OperationTagGroup } from "./components/OperationTagGroup.jsx";
import { ExportToolbar, SwaggerFrontLinks, buildExportFormats } from "./components/ExportToolbar.jsx";
import { AuthDialogs } from "./components/AuthDialogs.jsx";
import { SwaggerHeaderAuth } from "./components/SwaggerHeaderAuth.jsx";
import { SwaggerOpenGhPagesBtn } from "./components/SwaggerOpenGhPagesBtn.jsx";
import { SwaggerReloadBtn } from "./components/SwaggerReloadBtn.jsx";
import { SwaggerToolbarThemeBtn } from "./components/SwaggerToolbarThemeBtn.jsx";
import { ServerUrlField } from "./components/ServerUrlField.jsx";
import { ServerHealthBanner } from "./components/ServerHealthBanner.jsx";
import { ExpandStackProvider } from "./context/ExpandStackContext.jsx";
import { ServerBaseProvider } from "./context/ServerBaseContext.jsx";
import {
  groupOperationsByTag,
  buildDocIndex,
  buildLookupIndex,
} from "./lib/openapi/openapi.js";
import { getStoredJwt, clearJwt } from "./lib/auth/auth.js";
import { resolveAuthConfig } from "./lib/auth/orchestrator-base.js";
import { applyBrandToDocument, resolveViewerBrand } from "./lib/brand/viewer-brand.js";
import { buildNavRows, filterGroupsByNavTab, activeSectionTabId } from "./lib/nav/viewer-nav.js";

const { useState, useEffect, useMemo } = React;
const { Box, Typography, Alert } = MaterialUI;

export function SwaggerViewer({ config: configProp, spec: specProp, onReload, reloadBusy = false }) {
  const config = useMemo(
    () => (configProp ? { ...configProp, auth: resolveAuthConfig(configProp.auth, configProp.apiBase) } : configProp),
    [configProp],
  );
  const authEnabled =
    config?.auth?.enabled !== false &&
    (!!config?.auth?.loginUrl ||
      config?.auth?.loginKind === "portal" ||
      String(config?.auth?.loginPath || "").includes("portal-login"));
  const [spec, setSpec] = useState(specProp || null);
  const [err, setErr] = useState("");
  const [session, setSession] = useState(() => (authEnabled ? getStoredJwt() : null));
  const [navTab, setNavTab] = useState("");

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
  const navRows = useMemo(() => buildNavRows(config, session, navTab, setNavTab), [config, session, navTab]);
  const visibleGroups = useMemo(() => {
    const active = activeSectionTabId(navRows, config);
    if (!active) return groups;
    return filterGroupsByNavTab(groups, config, active);
  }, [groups, config, navRows]);
  const docIndex = useMemo(() => (spec ? buildDocIndex(spec) : {}), [spec]);
  const lookupIndex = useMemo(() => (spec ? buildLookupIndex(spec) : {}), [spec]);
  const brand = useMemo(() => resolveViewerBrand(config, spec), [config, spec]);
  const brandTitle = brand.title;
  const brandIcon = brand.icon;
  const ns = config?.ns || "ISA";

  useEffect(() => {
    applyBrandToDocument(brand, { lockMeta: !!(config?.brandLock || config?.brandLocked) });
  }, [brandTitle, brandIcon, config?.brandLock, config?.brandLocked]);

  useEffect(() => {
    if (!authEnabled) return;
    const saved = getStoredJwt();
    if (saved?.token) setSession(saved);
  }, [authEnabled]);

  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const embed = config?.embed === true;
  const useShell = config?.shell !== false && Shell && !embed;
  const externalAuth = config?.authUi === "external";
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
      {spec ? <ServerUrlField ns={ns} compact dense /> : null}
      <SwaggerReloadBtn onReload={onReload} busy={reloadBusy} ns={ns} />
      <SwaggerOpenGhPagesBtn config={config} ns={ns} />
      {authToolbarEnd}
      <SwaggerToolbarThemeBtn ns={ns} />
    </Box>
  );

  const exportToolbarBody = !useShell && spec ? (
    <ExportToolbar frontLinks={config?.frontLinks || []} ns={ns} brandIcon={brandIcon} docked={embed} showServer toolbarEnd={authToolbarEnd} />
  ) : null;

  const viewerBody = (
    <Box className="isa-sw-viewer" sx={{ p: shellLayout ? { xs: 1.5, sm: 2 } : 2, maxWidth: 1160, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {err ? <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert> : null}
      {spec ? (
        <>
          {exportToolbarBody}
          <ServerHealthBanner ns={ns} />
          {!shellLayout ? <InfoHeader spec={spec} showTitle ns={ns} /> : null}
          {visibleGroups.map((group, tagIndex) => (
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
  );

  const framed = useShell ? (
    <Shell
      ns={config.ns || "ISA"}
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
