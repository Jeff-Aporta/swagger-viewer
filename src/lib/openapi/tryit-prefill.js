/** Try-it: prefill PUT desde GET hermano y mostrar solo envelope.respuesta. */

import { jsonPretty, listOperations } from "./openapi.js";
import { opUsesRequestBody, resolveTryItBodyExample } from "./tryit-body.js";

const PUT_BODY_META_KEYS = new Set([
  "canEdit",
  "key",
  "ok",
  "updatedBy",
  "mode",
  "exec",
  "testsCount",
  "rowCount",
  "storage",
  "schema",
]);

export function findMatchingGetOp(spec, op) {
  if (!op?.path || !opUsesRequestBody(op.method)) return null;
  return listOperations(spec).find((o) => o.path === op.path && o.method === "get") ?? null;
}

/** Extrae `respuesta` del envelope InSoft (o el objeto si ya es plano). */
export function extractInsoftRespuesta(data) {
  if (data == null) return undefined;
  if (typeof data !== "object") return data;
  if (Object.prototype.hasOwnProperty.call(data, "respuesta")) return data.respuesta;
  return data;
}

/** JSON legible para panel de resultado (sin encabezado). */
export function formatTryItResultBody(data) {
  if (data == null) return "";
  if (typeof data === "string") {
    try {
      return formatTryItResultBody(JSON.parse(data));
    } catch {
      return data;
    }
  }
  const r = extractInsoftRespuesta(data);
  if (r !== undefined) return jsonPretty(r);
  return jsonPretty(data);
}

function upsertBodyFromInstruccionesRows(rows, putOp) {
  if (!Array.isArray(rows) || !rows.length) return undefined;
  const sample = resolveTryItBodyExample(putOp);
  const wantId = sample?.iinstruccion;
  const row = (wantId ? rows.find((x) => x?.iinstruccion === wantId) : null) ?? rows[0];
  if (!row || typeof row !== "object") return undefined;
  const out = { iinstruccion: row.iinstruccion, instruccion: row.instruccion };
  if (row.jconfig !== undefined) out.jconfig = row.jconfig;
  return out;
}

/** Cuerpo PUT inicial a partir de la respuesta GET (mismo path). */
export function extractTryItPutBodyFromGet(data, putOp) {
  const r = extractInsoftRespuesta(data);
  if (r == null || typeof r !== "object" || Array.isArray(r)) return undefined;

  if (r.config !== undefined && typeof r.config === "object" && !Array.isArray(r.config)) {
    return r.config;
  }

  if (Array.isArray(r.rows)) {
    const fromRows = upsertBodyFromInstruccionesRows(r.rows, putOp);
    if (fromRows) return fromRows;
  }

  if (r.kind === "insoft.client-testing" && Array.isArray(r.tests)) {
    return { kind: r.kind, version: r.version ?? 1, tests: r.tests };
  }

  const rest = {};
  for (const [k, v] of Object.entries(r)) {
    if (!PUT_BODY_META_KEYS.has(k)) rest[k] = v;
  }
  return Object.keys(rest).length ? rest : undefined;
}

export function tryItPrefillDeniedBody(status) {
  return jsonPretty({
    _aviso: "No tiene permiso para leer el valor actual (GET). Edite el body manualmente o inicie sesión.",
    _httpStatus: status,
  });
}

export function tryItPrefillLoadingBody() {
  return jsonPretty({ _cargando: "Consultando valor actual (GET)…" });
}
