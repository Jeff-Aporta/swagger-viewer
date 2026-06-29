/** Try it out — adjuntos configurables vía x-iss-tryit-attachments (por operación). */

import { jsonPretty } from "./openapi.js";

export const ISS_TRYIT_ATTACHMENTS_EXT = "x-iss-tryit-attachments";

const DEFAULT_IMAGES = { field: "imagenes", max: 10, filePicker: true, clipboard: true, encoding: "dataUrl" };
const DEFAULT_AUDIOS = { field: "audios", max: 5, filePicker: true, encoding: "dataUrl" };

function normSlot(raw, defaults) {
  if (raw === false || raw === null) return null;
  if (raw === true) return { ...defaults };
  if (typeof raw !== "object") return { ...defaults };
  return { ...defaults, ...raw };
}

/** Resuelve config de adjuntos: extensión explícita, tryitAttachments+catálogo, o inferencia desde schema. */
export function resolveTryItAttachments(op, spec) {
  const extRaw = op?.[ISS_TRYIT_ATTACHMENTS_EXT];
  if (extRaw === false) return null;
  if (extRaw && typeof extRaw === "object") return normalizeAttachConfig(extRaw);

  const catalog = spec?.catalog?.tryitAttachments || {};
  const ref = op?.tryitAttachments;
  if (ref === false) return null;
  if (typeof ref === "string") {
    const t = catalog.templates?.[ref];
    if (t) return normalizeAttachConfig(t);
  } else if (ref && typeof ref === "object") {
    return normalizeAttachConfig(ref);
  }
  const byPath = catalog.byPath?.[op?.path]?.[op?.method];
  if (byPath) return normalizeAttachConfig(byPath);

  if (catalog.inferFromSchema) return inferAttachmentsFromOp(op);
  return null;
}

function normalizeAttachConfig(raw) {
  const mode = raw.mode === "multipart" ? "multipart" : "json";
  const images = normSlot(raw.images, DEFAULT_IMAGES);
  const audios = normSlot(raw.audios, DEFAULT_AUDIOS);
  const files = raw.files && typeof raw.files === "object" ? { field: "file", max: 5, filePicker: true, ...raw.files } : null;
  const multipart = Array.isArray(raw.multipart) ? raw.multipart : null;
  if (!images && !audios && !files && !multipart?.length && mode !== "multipart") return null;
  return { mode, images, audios, files, multipart, bodyRawRule: raw.bodyRawRule || "merge" };
}

function inferAttachmentsFromOp(op) {
  const jsonSchema = op?.requestBody?.content?.["application/json"]?.schema;
  const props = jsonSchema?.properties;
  const mp = op?.requestBody?.content?.["multipart/form-data"];
  if (mp) {
    const multipart = inferMultipartFields(mp);
    if (multipart.length) return { mode: "multipart", images: null, audios: null, files: null, multipart, bodyRawRule: "merge" };
  }
  if (!props || typeof props !== "object") return null;
  const images = props.imagenes ? { ...DEFAULT_IMAGES } : null;
  const audios = props.audios ? { ...DEFAULT_AUDIOS } : null;
  if (!images && !audios) return null;
  return { mode: "json", images, audios, files: null, multipart: null, bodyRawRule: "merge" };
}

function inferMultipartFields(mpContent) {
  const schema = mpContent?.schema;
  const props = schema?.properties;
  if (!props || typeof props !== "object") return [];
  const out = [];
  for (const [name, def] of Object.entries(props)) {
    const d = def && typeof def === "object" ? def : {};
    if (d.type === "string" && d.format === "binary") {
      out.push({ name, type: "file", accept: d["x-iss-accept"] || d.accept || "*/*" });
    } else {
      out.push({ name, type: "text" });
    }
  }
  return out;
}

export function emptyAttachmentsState() {
  return { images: [], audios: [], files: [] };
}

function encodeValue(entry, slot) {
  const enc = slot?.encoding || "dataUrl";
  if (enc === "base64Object") {
    const m = String(entry.dataUrl || "").match(/^data:([^;]+);base64,(.+)$/i);
    if (m) return { mime: m[1], filename: entry.name, base64: m[2] };
    return { dataUrl: entry.dataUrl };
  }
  return entry.dataUrl;
}

/** Fusiona adjuntos en el JSON del body (modo json). */
export function mergeAttachmentsIntoJsonBody(rawText, attachments, config) {
  const base = String(rawText ?? "").trim() || "{}";
  let obj;
  try {
    obj = JSON.parse(base);
  } catch {
    throw new Error("Body JSON inválido; corrija el editor antes de enviar adjuntos.");
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) obj = {};
  if (config?.images && attachments?.images?.length) {
    const field = config.images.field || "imagenes";
    const encoded = attachments.images.map((e) => encodeValue(e, config.images));
    const prev = config.bodyRawRule === "replace" ? [] : Array.isArray(obj[field]) ? obj[field].filter((x) => typeof x === "string" || (x && typeof x === "object")) : [];
    obj[field] = [...prev, ...encoded].slice(0, config.images.max || 10);
  }
  if (config?.audios && attachments?.audios?.length) {
    const field = config.audios.field || "audios";
    const encoded = attachments.audios.map((e) => encodeValue(e, config.audios));
    const prev = config.bodyRawRule === "replace" ? [] : Array.isArray(obj[field]) ? obj[field].filter((x) => typeof x === "string" || (x && typeof x === "object")) : [];
    obj[field] = [...prev, ...encoded].slice(0, config.audios.max || 5);
  }
  return jsonPretty(obj);
}

/** FormData para mode multipart. */
export function buildMultipartBody(attachments, config, rawJsonText) {
  const fd = new FormData();
  const fields = config?.multipart || [];
  for (const f of fields) {
    if (f.type === "file") {
      const list = attachments?.files || [];
      const match = list.filter((e) => e.field === f.name || (!e.field && f.name === (config.files?.field || "file")));
      if (match.length) {
        for (const e of match) fd.append(f.name, e.file, e.name);
      }
      continue;
    }
    if (f.type === "json" && f.name) {
      fd.append(f.name, String(rawJsonText ?? "").trim() || "{}");
      continue;
    }
    if (f.value != null) fd.append(f.name, String(f.value));
  }
  if (config?.files?.field && attachments?.files?.length) {
    for (const e of attachments.files) {
      if (e.file) fd.append(e.field || config.files.field, e.file, e.name);
    }
  }
  return fd;
}

export function hasTryItAttachments(config) {
  if (!config) return false;
  if (config.mode === "multipart") return !!(config.multipart?.length || config.files);
  return !!(config.images || config.audios || config.files);
}
