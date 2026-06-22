/** Utilidades OpenAPI 3.x para el visor ISA. */

import { parseIsDocument } from "./is-document.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];
const ISS_SUBGROUP_EXTENSION = "x-isa-subgroup";
const ISS_SUBGROUPS_EXTENSION = "x-isa-subgroups";

function subgroupDefs(tagMeta) {
  const raw = tagMeta?.[ISS_SUBGROUPS_EXTENSION];
  return Array.isArray(raw) ? raw : [];
}

function resolveSubgroupDef(tagMeta, subgroupId) {
  const defs = subgroupDefs(tagMeta);
  const hit = defs.find((d) => d?.id === subgroupId);
  if (hit) return { ...hit };
  if (subgroupId) {
    return { id: subgroupId, name: subgroupId, icon: "mdi:folder-outline" };
  }
  return { id: "general", name: "General", icon: "mdi:folder-outline" };
}

function orderSubgroups(subgroupMap, tagMeta) {
  const ordered = [];
  const seen = new Set();
  for (const def of subgroupDefs(tagMeta)) {
    const id = def?.id;
    if (!id || !subgroupMap.has(id)) continue;
    ordered.push(subgroupMap.get(id));
    seen.add(id);
  }
  for (const [id, sub] of subgroupMap) {
    if (!seen.has(id)) ordered.push(sub);
  }
  return ordered.filter((s) => s.operations?.length);
}

export function opIdFromOperation(op, method, path) {
  if (op?.operationId) return op.operationId;
  return (
    method +
    "_" +
    path
      .replace(/\{(\w+)\}/g, "by_$1")
      .replace(/[^\w]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

export function extractJsonExample(media) {
  if (!media || typeof media !== "object") return undefined;
  if (media.example !== undefined) return media.example;
  if (media.examples && typeof media.examples === "object") {
    for (const key of Object.keys(media.examples)) {
      const ex = media.examples[key];
      if (ex && ex.value !== undefined) return ex.value;
    }
  }
  if (media.schema?.example !== undefined) return media.schema.example;
  return undefined;
}

export function listOperations(spec) {
  const paths = spec?.paths || {};
  const out = [];
  for (const path of Object.keys(paths)) {
    const item = paths[path];
    if (!item || typeof item !== "object") continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      out.push({
        path,
        method,
        operationId: opIdFromOperation(op, method, path),
        ...op,
      });
    }
  }
  return out;
}

export function groupOperationsByTag(spec) {
  const ops = listOperations(spec);
  const tagMeta = new Map();
  for (const t of spec?.tags || []) {
    if (t?.name) tagMeta.set(t.name, t);
  }
  const groups = new Map();
  for (const op of ops) {
    const tags = op.tags?.length ? op.tags : ["General"];
    for (const name of tags) {
      if (!groups.has(name)) {
        const meta = tagMeta.get(name) || {};
        groups.set(name, {
          name,
          description: meta.description || "",
          meta,
          operations: [],
          subgroupMap: new Map(),
        });
      }
      const g = groups.get(name);
      g.operations.push(op);

      const subgroupId = String(op[ISS_SUBGROUP_EXTENSION] ?? "").trim();
      const subKey = subgroupId || "__default__";
      if (!g.subgroupMap.has(subKey)) {
        g.subgroupMap.set(subKey, {
          ...resolveSubgroupDef(g.meta, subgroupId),
          operations: [],
        });
      }
      g.subgroupMap.get(subKey).operations.push(op);
    }
  }
  return [...groups.values()].map((g) => {
    const subgroups = orderSubgroups(g.subgroupMap, g.meta);
    const hasNamedSubgroups = subgroups.some((s) => s.id && s.id !== "general" && s.id !== "__default__");
    return {
      name: g.name,
      description: g.description,
      meta: g.meta,
      operations: g.operations,
      subgroups: hasNamedSubgroups ? subgroups : [],
    };
  });
}

export function buildDocIndex(spec) {
  const out = {};
  for (const op of listOperations(spec)) {
    if (op["x-iss-doc-md"]) out[op.operationId] = op["x-iss-doc-md"];
  }
  return out;
}

export function buildLookupIndex(spec) {
  const out = {};
  const params = spec?.components?.parameters || {};
  for (const [name, def] of Object.entries(params)) {
    const lookup = def?.["x-iss-lookup"];
    if (lookup) out[name] = lookup;
  }
  for (const op of listOperations(spec)) {
    for (const p of op.parameters || []) {
      const ref = p.$ref;
      if (ref) {
        const key = ref.split("/").pop();
        const def = params[key];
        if (def?.["x-iss-lookup"]) out[p.name || key] = def["x-iss-lookup"];
      }
      if (p["x-iss-lookup"] && p.name) out[p.name] = p["x-iss-lookup"];
    }
  }
  return out;
}

export function operationRequiresBearer(op, spec) {
  const schemes = spec?.components?.securitySchemes || {};
  const sec = op.security ?? spec?.security ?? [];
  for (const req of sec) {
    for (const name of Object.keys(req)) {
      const sch = schemes[name];
      if (sch?.type === "http" && sch.scheme === "bearer") return true;
      if (name === "Bearer") return true;
    }
  }
  return false;
}

export function resolveServerUrl(spec, serverIndex = 0) {
  const servers = spec?.servers || [];
  const s = servers[serverIndex] || servers[0];
  if (!s?.url) return "";
  let url = String(s.url).replace(/\/$/, "");
  const vars = s.variables || {};
  for (const [k, v] of Object.entries(vars)) {
    const val = v?.default ?? "";
    url = url.replace(`{${k}}`, val);
  }
  return url;
}

export function jsonPretty(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function responseTone(code) {
  const n = Number(code);
  if (n >= 200 && n < 300) return "ok";
  if (n === 401 || n === 403) return "auth";
  if (n >= 400 && n < 500) return "warn";
  if (n >= 500) return "err";
  return "neutral";
}

export async function loadSpec(config) {
  const parsed = parseIsDocument(config);
  if (parsed) return parsed.spec;
  if (config.spec && typeof config.spec === "object") return config.spec;
  const url = config.specUrl || config.url;
  if (!url) throw new Error("SwaggerViewer: spec o specUrl requerido");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`No se pudo cargar OpenAPI (${res.status})`);
  return res.json();
}
