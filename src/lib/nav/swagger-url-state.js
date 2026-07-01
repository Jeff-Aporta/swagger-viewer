import {
  isOpenDerived,
  isOpIndex,
  mostRecentOpen,
  normalizeOpenStack,
  opIndexFromResp,
  toggleInStack,
} from "./expand-stack.js";
import { readLegacyNavParam, stripLegacyNavParam } from "./viewer-nav-url.js";

const STATE_VERSION = 1;
/** Tabs por operación persistidas en `?s=` (v→open→tab→opTabs→params). */
const OP_TAB_IDS = new Set(["try", "overview", "doc"]);
const PARAM_VALUE_MAX = 200;

function normalizeOpTabId(raw) {
  const id = String(raw ?? "").trim();
  return OP_TAB_IDS.has(id) ? id : "try";
}

function normalizeOpTabs(raw, openStack = []) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const openOps = collectOpenOpIndexes(openStack);
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = String(k ?? "").trim();
    if (!isOpIndex(id)) continue;
    if (openOps.size && !openOps.has(id)) continue;
    const tab = normalizeOpTabId(v);
    out[id] = tab;
  }
  return out;
}

function normalizeParamValues(raw, openStack = []) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const openOps = collectOpenOpIndexes(openStack);
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = String(k ?? "").trim();
    if (!isOpIndex(id)) continue;
    if (openOps.size && !openOps.has(id)) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const next = {};
    for (const [pk, pv] of Object.entries(v)) {
      if (pv == null) continue;
      const str = String(pv);
      if (!str) continue;
      if (str.length > PARAM_VALUE_MAX) continue;
      next[String(pk)] = str;
    }
    if (Object.keys(next).length) out[id] = next;
  }
  return out;
}

function collectOpenOpIndexes(openStack) {
  const out = new Set();
  for (const id of normalizeOpenStack(openStack)) {
    if (isOpIndex(id)) out.add(id);
    else {
      const opId = opIndexFromResp(id);
      if (opId) out.add(opId);
    }
  }
  return out;
}

let _api = null;

export function getSwaggerExpandUrlState() {
  return _api;
}

export function initSwaggerExpandUrlState() {
  if (_api) return _api;
  const createUrlState = globalThis.ISAFront?.createUrlState;
  if (!createUrlState) return null;

  const urlState = createUrlState({
    param: "s",
    debounceMs: 300,
    initial: () => ({ v: STATE_VERSION, open: [], tab: "", opTabs: {}, params: {} }),
    normalize(raw) {
      const open = normalizeOpenStack(raw?.open);
      return {
        v: STATE_VERSION,
        open,
        tab: String(raw?.tab ?? "").trim(),
        opTabs: normalizeOpTabs(raw?.opTabs, open),
        params: normalizeParamValues(raw?.params, open),
      };
    },
    slimForUrl(state) {
      const tab = String(state?.tab ?? "").trim();
      const opTabs = normalizeOpTabs(state?.opTabs, state?.open);
      const params = normalizeParamValues(state?.params, state?.open);
      const out = {
        v: STATE_VERSION,
        open: normalizeOpenStack(state?.open),
        ...(tab ? { tab } : {}),
        ...(Object.keys(opTabs).length ? { opTabs } : {}),
        ...(Object.keys(params).length ? { params } : {}),
      };
      return out;
    },
    onInit(state, api) {
      const legacyNav = readLegacyNavParam();
      if (!legacyNav) return;
      stripLegacyNavParam();
      if (!String(state?.tab ?? "").trim()) api.mergePartial({ tab: legacyNav });
    },
  });

  _api = {
    getOpenStack: () => urlState.getSnapshot().open || [],
    getNavTab: () => String(urlState.getSnapshot().tab ?? "").trim(),
    getSnapshot: urlState.getSnapshot,
    subscribe: urlState.subscribe,
    mergePartial: urlState.mergePartial,
    mostRecent: () => mostRecentOpen(urlState.getSnapshot().open),
    isOpenDerived(id) {
      return isOpenDerived(urlState.getSnapshot().open, id);
    },
    toggle(id, expanded) {
      const stack = toggleInStack(urlState.getSnapshot().open, id, expanded);
      urlState.mergePartial({ open: stack });
    },
    getOpTab(expandId) {
      if (!expandId) return "";
      const opTabs = urlState.getSnapshot().opTabs || {};
      return opTabs[String(expandId)] || "";
    },
    setOpTab(expandId, tabId) {
      if (!expandId) return;
      const tab = normalizeOpTabId(tabId);
      const opTabs = { ...(urlState.getSnapshot().opTabs || {}) };
      if (tab === "try") delete opTabs[String(expandId)];
      else opTabs[String(expandId)] = tab;
      urlState.mergePartial({ opTabs });
    },
    getOpParams(expandId) {
      if (!expandId) return {};
      const params = urlState.getSnapshot().params || {};
      return params[String(expandId)] || {};
    },
    setOpParam(expandId, paramName, value) {
      if (!expandId || !paramName) return;
      const id = String(expandId);
      const pk = String(paramName);
      const all = { ...(urlState.getSnapshot().params || {}) };
      const entry = { ...(all[id] || {}) };
      const str = value == null ? "" : String(value);
      if (!str || str.length > PARAM_VALUE_MAX) {
        delete entry[pk];
      } else {
        entry[pk] = str;
      }
      if (Object.keys(entry).length) all[id] = entry;
      else delete all[id];
      urlState.mergePartial({ params: all });
    },
    boot: urlState.boot,
  };

  return _api;
}
