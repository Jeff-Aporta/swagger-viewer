/** Confirmación Try it out — solo mutaciones con JWT (security: bearer). */

import { operationRequiresBearer } from "./openapi.js";

const MUTATING = new Set(["post", "put", "patch", "delete"]);

const METHOD_META = {
  delete: { icon: "mdi:delete-alert-outline", accent: "#ef4444", verb: "eliminar" },
  post: { icon: "mdi:plus-circle-outline", accent: "#22c55e", verb: "crear o modificar" },
  put: { icon: "mdi:database-edit-outline", accent: "#f59e0b", verb: "actualizar" },
  patch: { icon: "mdi:playlist-edit", accent: "#a855f7", verb: "modificar parcialmente" },
};

export function isMutatingMethod(method) {
  return MUTATING.has(String(method || "").toLowerCase());
}

/** Requiere modal solo si la operación exige Bearer y es POST/PUT/PATCH/DELETE. */
export function needsTryItConfirm(op, spec, authEnabled) {
  if (!authEnabled || !op) return false;
  if (!isMutatingMethod(op.method)) return false;
  return operationRequiresBearer(op, spec);
}

function sessionUser(session) {
  return session?.displayName || session?.username || session?.icontacto || "sin sesión";
}

function applyTemplate(str, vars) {
  if (str == null) return "";
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : `{{${key}}}`));
}

function applyLines(lines, vars) {
  const arr = Array.isArray(lines) ? lines : lines ? [lines] : [];
  return arr.map((line) => applyTemplate(line, vars)).filter(Boolean);
}

function resolveConfirmDef(op, spec) {
  const catalog = spec?.catalog?.tryitConfirm || {};
  const raw = op?.tryitConfirm;
  if (raw === false) return null;
  if (typeof raw === "string") {
    const t = catalog.templates?.[raw];
    if (t) return t;
  }
  if (raw && typeof raw === "object") return raw;
  const byPath = catalog.byPath?.[op.path]?.[op.method];
  if (byPath) return byPath;
  const byMethod = catalog.byMethod?.[op.method];
  if (byMethod) return byMethod;
  return catalog.default || null;
}

export function buildTryItConfirmCopy(op, spec, ctx = {}) {
  const method = String(op?.method || "get").toUpperCase();
  const path = String(op?.path || "");
  const m = String(op?.method || "").toLowerCase();
  const meta = METHOD_META[m] || METHOD_META.post;
  const session = ctx.session;
  const vars = {
    method,
    path,
    url: ctx.url || "",
    summary: op?.summary || "",
    sessionUser: sessionUser(session),
    verb: meta.verb,
    ...ctx.values,
  };
  const def = resolveConfirmDef(op, spec) || {};
  const lines =
    def.lines?.length
      ? applyLines(def.lines, vars)
      : [
          applyTemplate("Va a ejecutar **{{method}}** `{{url}}`.", vars),
          applyTemplate("Operación autenticada (JWT). Sesión: **{{sessionUser}}**.", vars),
          applyTemplate("Revise parámetros y body antes de continuar.", vars),
        ];
  return {
    title: applyTemplate(def.title || "Confirmar {{method}} {{path}}", vars),
    icon: def.icon || meta.icon,
    accent: def.accent || meta.accent,
    buttonColor: def.buttonColor || (m === "delete" ? "error" : m === "post" ? "success" : "warning"),
    alert: applyTemplate(def.alert || "Acción con impacto — confirme antes de continuar.", vars),
    lines,
    acceptLabel: applyTemplate(def.acceptLabel || "Aceptar y ejecutar {{method}}", vars),
  };
}

/** @deprecated */
export const isSwaggerConfigPut = (op) =>
  isMutatingMethod(op?.method) && String(op?.path || "").replace(/\/+$/, "") === "/swagger.json";
