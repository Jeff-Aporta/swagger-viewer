import {
  isOpenDerived,
  isOpIndex,
  mostRecentOpen,
  normalizeOpenStack,
  opIndexFromResp,
  toggleInStack,
} from "./expand-stack.js";

const STATE_VERSION = 1;
const OP_TAB_IDS = new Set(["try", "overview", "doc"]);

let _api = null;

function normalizeOpTabId(raw) {
  const id = String(raw || "").trim();
  return OP_TAB_IDS.has(id) ? id : "try";
}

function normalizeOpTabs(raw, openStack = []) {
  if (!raw || typeof raw !== "object") return {};
  const openOps = new Set();
  for (const id of normalizeOpenStack(openStack)) {
    if (isOpIndex(id)) openOps.add(id);
    else {
      const opId = opIndexFromResp(id);
      if (opId) openOps.add(opId);
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isOpIndex(k)) continue;
    if (openOps.size && !openOps.has(k)) continue;
    out[k] = normalizeOpTabId(v);
  }
  return out;
}

function normalizeParamValues(raw, openStack = []) {
  if (!raw || typeof raw !== "object") return {};
  const openOps = new Set();
  for (const id of normalizeOpenStack(openStack)) {
    if (isOpIndex(id)) openOps.add(id);
    else {
      const opId = opIndexFromResp(id);
      if (opId) openOps.add(opId);
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!isOpIndex(k)) continue;
    if (openOps.size && !openOps.has(k)) continue;
    if (!v || typeof v !== "object") continue;
    const next = {};
    for (const [pk, pv] of Object.entries(v)) {
      if (pv == null) continue;
      const str = String(pv);
      if (!str) continue;
      if (str.length > 200) continue;
      next[String(pk)] = str;
    }
    if (Object.keys(next).length) out[k] = next;
  }
  return out;
}

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
    initial: () => ({ v: STATE_VERSION, open: [], tabs: {}, params: {} }),
    normalize(raw) {
      const open = normalizeOpenStack(raw?.open);
      return {
        v: STATE_VERSION,
        open,
        tabs: normalizeOpTabs(raw?.tabs, open),
        params: normalizeParamValues(raw?.params, open),
      };
    },
    slimForUrl(state) {
      const open = normalizeOpenStack(state?.open);
      const tabs = normalizeOpTabs(state?.tabs, open);
      const params = normalizeParamValues(state?.params, open);
      const out = { v: STATE_VERSION, open };
      if (Object.keys(tabs).length) out.tabs = tabs;
      if (Object.keys(params).length) out.params = params;
      return out;
    },
  });

  _api = {
    getOpenStack: () => urlState.getSnapshot().open || [],
    getSnapshot: urlState.getSnapshot,
    subscribe: urlState.subscribe,
    mergePartial: urlState.mergePartial,
    mostRecent: () => mostRecentOpen(urlState.getSnapshot().open),
    getOpTab(id) {
      const tabs = urlState.getSnapshot().tabs || {};
      return normalizeOpTabId(tabs[id]);
    },
    setOpTab(id, tabId) {
      if (!isOpIndex(id)) return;
      const next = normalizeOpTabId(tabId);
      const tabs = { ...(urlState.getSnapshot().tabs || {}), [id]: next };
      urlState.mergePartial({ tabs });
    },
    getOpParams(id) {
      if (!isOpIndex(id)) return {};
      const all = urlState.getSnapshot().params || {};
      return all[id] ? { ...all[id] } : {};
    },
    setOpParam(id, name, value) {
      if (!isOpIndex(id)) return;
      const snap = urlState.getSnapshot();
      const all = { ...(snap.params || {}) };
      const cur = { ...(all[id] || {}) };
      if (value == null || String(value) === "") delete cur[name];
      else cur[name] = String(value);
      if (Object.keys(cur).length) all[id] = cur;
      else delete all[id];
      urlState.mergePartial({ params: all });
    },
    isOpenDerived(id) {
      return isOpenDerived(urlState.getSnapshot().open, id);
    },
    toggle(id, expanded) {
      const snap = urlState.getSnapshot();
      const stack = toggleInStack(snap.open, id, expanded);
      const tabs = { ...(snap.tabs || {}) };
      const params = { ...(snap.params || {}) };
      if (!expanded) {
        const opId = isOpIndex(id) ? id : opIndexFromResp(id);
        if (opId && !isOpenDerived(stack, opId)) {
          delete tabs[opId];
          delete params[opId];
        }
      }
      urlState.mergePartial({ open: stack, tabs, params });
    },
    boot: urlState.boot,
  };

  return _api;
}
