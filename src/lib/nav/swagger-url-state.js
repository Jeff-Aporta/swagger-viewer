import {
  isOpenDerived,
  mostRecentOpen,
  normalizeOpenStack,
  toggleInStack,
} from "./expand-stack.js";

const STATE_VERSION = 1;

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
    initial: () => ({ v: STATE_VERSION, open: [] }),
    normalize(raw) {
      return {
        v: STATE_VERSION,
        open: normalizeOpenStack(raw?.open),
      };
    },
    slimForUrl(state) {
      return {
        v: STATE_VERSION,
        open: normalizeOpenStack(state?.open),
      };
    },
  });

  _api = {
    getOpenStack: () => urlState.getSnapshot().open || [],
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
    boot: urlState.boot,
  };

  return _api;
}
