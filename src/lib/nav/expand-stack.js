/** Stack de acordeones abiertos — índices jerárquicos cortos (tag.op · tag.op.resp). */

export const EXPAND_STACK_MAX = 30;

const INDEX_RE = /^\d+(\.\d+){1,2}$/;

export function opExpandIndex(tagIdx, opIdx) {
  return `${tagIdx}.${opIdx}`;
}

export function respExpandIndex(tagIdx, opIdx, respIdx) {
  return `${tagIdx}.${opIdx}.${respIdx}`;
}

export function isOpIndex(id) {
  return /^\d+\.\d+$/.test(String(id || ""));
}

export function isRespIndex(id) {
  return /^\d+\.\d+\.\d+$/.test(String(id || ""));
}

export function opIndexFromResp(id) {
  if (!isRespIndex(id)) return null;
  const parts = String(id).split(".");
  return `${parts[0]}.${parts[1]}`;
}

export function isValidExpandIndex(id) {
  return INDEX_RE.test(String(id || ""));
}

export function pushOpen(stack, id) {
  const list = Array.isArray(stack) ? stack.filter((x) => x !== id) : [];
  list.push(id);
  return list.slice(-EXPAND_STACK_MAX);
}

export function removeOpen(stack, id) {
  return (Array.isArray(stack) ? stack : []).filter((x) => x !== id);
}

export function isInStack(stack, id) {
  return (Array.isArray(stack) ? stack : []).includes(id);
}

/** Abierto si está en stack o hay una respuesta hija abierta (acordeón de operación). */
export function isOpenDerived(stack, id) {
  if (isInStack(stack, id)) return true;
  if (isOpIndex(id)) {
    const prefix = `${id}.`;
    return (Array.isArray(stack) ? stack : []).some((x) => x.startsWith(prefix));
  }
  return false;
}

export function mostRecentOpen(stack) {
  const list = Array.isArray(stack) ? stack : [];
  return list.length ? list[list.length - 1] : null;
}

export function normalizeOpenStack(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => typeof x === "string" && isValidExpandIndex(x))
    .slice(-EXPAND_STACK_MAX);
}

export function toggleInStack(stack, id, expanded) {
  if (expanded) {
    let next = Array.isArray(stack) ? stack : [];
    const opIdx = opIndexFromResp(id);
    if (opIdx) next = pushOpen(next, opIdx);
    return pushOpen(next, id);
  }
  return removeOpen(stack, id);
}

export function scrollToExpandId(id) {
  if (!id || typeof document === "undefined") return false;
  const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
  const el = document.querySelector(`[data-sw-expand="${esc}"]`);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}
