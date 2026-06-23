/** Pestañas AppShell desde viewer.nav — primaria (API) + secundaria anidada (secciones). */

import { parseJwtClaims } from "../lookup/lookup-label.js";
import { stripContapymeEmail } from "../auth/auth.js";

const PRIMARY_API_TAB = { id: "api", label: "API", icon: "mdi:api" };

function normUser(id) {
  const s = String(id ?? "").trim().toUpperCase();
  if (!s) return "";
  const bare = stripContapymeEmail(s).toUpperCase();
  return bare || s;
}

export function resolveSessionIdentity(session) {
  const claims = session?.claims || (session?.token ? parseJwtClaims(session.token) : null);
  const users = new Set();
  for (const raw of [claims?.icontacto, session?.username, claims?.username]) {
    const u = normUser(raw);
    if (u) users.add(u);
  }
  let role =
    String(session?.role || claims?.role || "").trim().toLowerCase() ||
    String(globalThis.ISAFront?.Session?.current?.()?.role || "").trim().toLowerCase();
  return { users, role, roles: role ? [role] : [] };
}

function accessIsPublic(access) {
  if (access === "*" || access === true) return true;
  if (Array.isArray(access)) return access.some((x) => String(x).trim() === "*");
  if (access && typeof access === "object" && access.public === true) return true;
  return false;
}

export function canAccessNavTab(tab, session) {
  const access = tab?.access;
  if (access == null || accessIsPublic(access)) return true;
  const { users, roles } = resolveSessionIdentity(session);
  const listUsers = Array.isArray(access)
    ? access.filter((x) => String(x).trim() !== "*").map(normUser)
    : Array.isArray(access?.users)
      ? access.users.map(normUser)
      : [];
  const listRoles = Array.isArray(access?.roles)
    ? access.roles.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
    : [];
  if (!listUsers.length && !listRoles.length) return true;
  if (listUsers.some((u) => users.has(u))) return true;
  if (listRoles.length && roles.some((r) => listRoles.includes(r))) return true;
  return false;
}

/** Secciones anidadas (viewer.nav) — sin fallback; vacío = solo tab API primaria. */
export function resolveNavTabDefs(config) {
  const raw = config?.nav;
  if (!Array.isArray(raw) || !raw.length) return [];
  return raw
    .map((t) => ({
      id: String(t.id || t.label || "").trim() || "tab",
      label: String(t.label || t.id || "Tab").trim(),
      icon: String(t.icon || "mdi:api").trim(),
      tags: Array.isArray(t.tags) ? t.tags.map((x) => String(x).trim()).filter(Boolean) : null,
      access: t.access,
    }))
    .filter((t) => t.id && t.label);
}

export function resolveVisibleNavTabs(config, session) {
  return resolveNavTabDefs(config).filter((t) => canAccessNavTab(t, session));
}

export function filterGroupsByNavTab(groups, config, activeTabId) {
  const tabs = resolveNavTabDefs(config);
  if (!tabs.length) return groups;
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  if (!tab?.tags?.length) return groups;
  const allow = new Set(tab.tags);
  return groups.filter((g) => allow.has(g.name));
}

/** navRows[0] = API (primaria); navRows[1] = secciones OpenAPI (secundaria, tier secondary). */
export function buildNavRows(config, session, activeTabId, onChange) {
  const sectionTabs = resolveVisibleNavTabs(config, session);
  const sectionValue = sectionTabs.some((t) => t.id === activeTabId) ? activeTabId : sectionTabs[0]?.id || "";
  const rows = [
    {
      id: "main",
      value: PRIMARY_API_TAB.id,
      onChange: () => {},
      tabs: [PRIMARY_API_TAB],
    },
  ];
  if (sectionTabs.length) {
    rows.push({
      id: "sections",
      tier: "secondary",
      value: sectionValue,
      onChange: (v) => onChange?.(v),
      tabs: sectionTabs.map(({ id, label, icon }) => ({ id, label, icon })),
    });
  }
  return rows;
}

/** Valor activo de la fila secundaria (para filtrar grupos de operaciones). */
export function activeSectionTabId(navRows, config) {
  const sectionRow = Array.isArray(navRows) ? navRows.find((r) => r.id === "sections") : null;
  if (sectionRow?.value) return sectionRow.value;
  const tabs = resolveNavTabDefs(config);
  return tabs[0]?.id || "";
}
