// server/envelope.ts
var TS = "2026-06-19T15:30:00.000Z";
var TS_OUT = "2026-06-19T15:30:00.042Z";
var INSOFT_ENCABEZADO_OK = {
  resultado: true,
  tiempo: -1,
  fhentrada: TS,
  fhsalida: TS_OUT
};
function insoftEncabezadoError(imensaje, mensaje) {
  return {
    resultado: false,
    tiempo: -1,
    fhentrada: TS,
    fhsalida: "2026-06-19T15:30:00.012Z",
    imensaje,
    mensaje
  };
}
function exampleOk(respuesta) {
  return {
    encabezado: INSOFT_ENCABEZADO_OK,
    respuesta
  };
}
var INSOFT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    encabezado: {
      type: "object",
      properties: {
        resultado: { type: "boolean" },
        tiempo: { type: "number" },
        fhentrada: { type: "string", format: "date-time" },
        fhsalida: { type: "string", format: "date-time" },
        imensaje: { type: "integer" },
        mensaje: { type: "string" }
      }
    },
    respuesta: { type: "object" }
  }
};
var INSOFT_ERROR_SCHEMA = {
  type: "object",
  required: ["encabezado"],
  properties: {
    encabezado: INSOFT_RESPONSE_SCHEMA.properties.encabezado
  }
};
var EXAMPLE_401 = {
  encabezado: insoftEncabezadoError(
    401020,
    'No se ha definido el par\xE1metro de autenticaci\xF3n, por favor verifique que est\xE9 enviando el header, query o par\xE1metro "authorization"'
  )
};
var EXAMPLE_403 = {
  encabezado: insoftEncabezadoError(403010, "No tiene permisos para acceder a este recurso.")
};
var EXAMPLE_404 = {
  encabezado: insoftEncabezadoError(404010, "No se ha encontrado el recurso solicitado. ")
};
var EXAMPLE_503 = {
  encabezado: insoftEncabezadoError(503010, "El servicio no est\xE1 disponible temporalmente.")
};

// server/api-presets.ts
var ISS_LOCAL_API_BASE = "http://127.0.0.1:8802/api";
var ISS_WEB_API_BASE = "https://ayudascp-ia-staging.azurewebsites.net/api";
function normApiBase(url) {
  return String(url || "").replace(/\/$/, "");
}
function buildOpenApiServers(activeBase) {
  const active = normApiBase(activeBase || ISS_WEB_API_BASE);
  const presets = [
    [active, "API activa (contexto actual)"],
    [ISS_LOCAL_API_BASE, "Local (ISS Functions)"],
    [ISS_WEB_API_BASE, "Web (staging Azure)"]
  ];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const [url, description] of presets) {
    const u = normApiBase(url);
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ url: u, description });
  }
  return out;
}

// server/spec.ts
var ISS_DOC_MD_EXTENSION = "x-iss-doc-md";
var ISS_LOOKUP_EXTENSION = "x-iss-lookup";
var ISS_LIST_FILTER_EXTENSION = "x-iss-list-filter";
var ISS_SUBGROUP_EXTENSION = "x-isa-subgroup";
var ISS_SUBGROUPS_EXTENSION = "x-isa-subgroups";
var ISS_REQUEST_BODY_EXAMPLES_EXTENSION = "x-iss-request-body-examples";
var ISS_INPUT_RECOMMENDATION_EXTENSION = "x-iss-input-recommendation";
var jsonResponse = (description, schema = { type: "object" }, example) => {
  const media = { schema };
  if (example !== void 0) media.example = example;
  return {
    description,
    content: { "application/json": media }
  };
};
var jsonRequestBody = (description, schema, example, required = true) => ({
  required,
  description,
  content: {
    "application/json": {
      schema,
      example
    }
  }
});
var bearerSecurity = [{ Bearer: [] }];
function bearerComponents() {
  return {
    securitySchemes: {
      Bearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token de acceso. Pide uno de prueba con el bot\xF3n superior o pega el tuyo en Authorize."
      }
    }
  };
}
function okSchema(respuestaSchema = { type: "object" }) {
  return {
    ...INSOFT_RESPONSE_SCHEMA,
    properties: {
      ...INSOFT_RESPONSE_SCHEMA.properties,
      respuesta: respuestaSchema
    }
  };
}
function issRspOk(description, example, respuestaSchema = { type: "object" }) {
  return jsonResponse(description, okSchema(respuestaSchema), example);
}
var issRsp401 = () => jsonResponse("No autorizado", INSOFT_ERROR_SCHEMA, EXAMPLE_401);
var issRsp403 = () => jsonResponse("Prohibido", INSOFT_ERROR_SCHEMA, EXAMPLE_403);
var issRsp404 = () => jsonResponse("No encontrado", INSOFT_ERROR_SCHEMA, EXAMPLE_404);
var issRsp503 = () => jsonResponse("Servicio no disponible", INSOFT_ERROR_SCHEMA, EXAMPLE_503);
function issRspAuth(okDesc, example, respuestaSchema) {
  return {
    "200": issRspOk(okDesc, example, respuestaSchema),
    "401": issRsp401()
  };
}
function issRspAuthForbidden(okDesc, example, respuestaSchema) {
  return {
    "200": issRspOk(okDesc, example, respuestaSchema),
    "401": issRsp401(),
    "403": issRsp403()
  };
}
function issRspAuthNotFound(okDesc, example, respuestaSchema) {
  return {
    "200": issRspOk(okDesc, example, respuestaSchema),
    "401": issRsp401(),
    "404": issRsp404()
  };
}
function issRspHealth(healthExample) {
  const example = healthExample ?? exampleOk({
    ok: true,
    service: "api",
    authMode: "worker"
  });
  return {
    "200": issRspOk("Servicio operativo", example, { type: "object" }),
    "503": issRsp503()
  };
}
function issRspSseDoc(okDesc, example) {
  return {
    "200": {
      description: okDesc,
      content: {
        "text/event-stream": {
          schema: { type: "string" },
          example: `data: ${JSON.stringify(example)}

`
        },
        "application/json": {
          schema: okSchema(),
          example
        }
      }
    },
    "401": issRsp401()
  };
}

// server/list-filter-schema.ts
var ISS_LIST_FILTER_DEFAULT_LIMIT = 9999;
var ISS_LIST_FILTER_MAX_LIMIT = 9999;
function sortKeysFromMeta(meta) {
  const s = meta.sort;
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Object.keys(s);
}
function distinctColumnsFromMeta(meta) {
  const explicit = meta.distinct?.columns;
  if (explicit?.length) return [...explicit];
  const cols = /* @__PURE__ */ new Set();
  for (const def of Object.values(meta.eq || {})) {
    for (const c of def.distinctLookup?.columns || []) cols.add(c);
  }
  return [...cols];
}
function searchColumnOptionsFromMeta(meta) {
  const out = /* @__PURE__ */ new Set();
  for (const c of distinctColumnsFromMeta(meta)) out.add(c);
  for (const c of meta.search?.columns || []) out.add(c);
  if (meta.search?.idColumn) out.add(meta.search.idColumn);
  return [...out];
}
function eqFieldJsonSchema(def) {
  const t = def.type || "string";
  const base = {};
  if (def.description) base.description = def.description;
  if (t === "integer" || t === "number") {
    return { ...base, type: t, ...def.enum ? { enum: def.enum } : {}, ...def.minimum != null ? { minimum: def.minimum } : {}, ...def.maximum != null ? { maximum: def.maximum } : {} };
  }
  if (t === "boolean") return { ...base, type: "boolean" };
  return { ...base, type: "string", ...def.enum ? { enum: def.enum.map(String) } : {} };
}
function buildIssListFilterSchema(meta, opts) {
  if (meta.filterSchema && typeof meta.filterSchema === "object") return meta.filterSchema;
  const maxLimit = opts?.maxLimit ?? ISS_LIST_FILTER_MAX_LIMIT;
  const defaultLimit = opts?.defaultLimit ?? meta.defaults?.limit ?? ISS_LIST_FILTER_DEFAULT_LIMIT;
  const sortKeys = sortKeysFromMeta(meta);
  const distinctCols = distinctColumnsFromMeta(meta);
  const searchCols = searchColumnOptionsFromMeta(meta);
  const eqProps = {};
  for (const [k, def] of Object.entries(meta.eq || {})) eqProps[k] = eqFieldJsonSchema(def);
  const properties = {
    search: { type: "string", maxLength: 200, description: meta.searchHint || meta.search?.description || "Texto libre; el recurso define en qu\xE9 columnas busca." },
    limit: { type: "integer", minimum: 1, maximum: maxLimit, default: defaultLimit },
    offset: { type: "integer", minimum: 0, default: meta.defaults?.offset ?? 0 }
  };
  if (Object.keys(eqProps).length) {
    properties.eq = { type: "object", additionalProperties: false, properties: eqProps, description: "Filtros de igualdad exacta (AND)." };
  }
  if (sortKeys.length) {
    properties.sort = { type: "string", enum: [...sortKeys, ...sortKeys.map((k) => `-${k}`)], description: "Campo de orden. Prefijo `-` = descendente." };
  } else {
    properties.sort = { type: "string", maxLength: 64, description: "Campo de orden. Prefijo `-` = descendente." };
  }
  if (distinctCols.length) {
    properties.distinct = { type: "array", minItems: 1, items: { type: "string", enum: distinctCols }, description: meta.distinct?.description || "Columnas para SELECT DISTINCT (lookup/autocomplete)." };
    if (searchCols.length) {
      properties.searchColumn = { type: "string", enum: searchCols, description: "Columna donde aplicar search (modo distinct o b\xFAsqueda acotada)." };
    }
  }
  return { type: "object", description: "Filtro ISS para listados (query `f` = JSON en Base64).", properties, additionalProperties: false };
}
function enrichListFilterMeta(meta) {
  const m = meta;
  return { ...meta, filterSchema: m.filterSchema ?? buildIssListFilterSchema(m) };
}
function enrichListFilterCatalog(catalog) {
  const listFilters = catalog?.listFilters;
  if (!listFilters) return catalog ?? {};
  const enriched = {};
  for (const [key, meta] of Object.entries(listFilters)) {
    enriched[key] = enrichListFilterMeta(meta);
  }
  return { ...catalog, listFilters: enriched };
}

// server/build-spec.ts
function encodeIssFilterB64(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function resolveFPreset(catalog, key) {
  if (!key) return void 0;
  const p = catalog.fPresets?.[key];
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    throw new Error(`openapi-config: fPreset \xAB${key}\xBB no definido`);
  }
  return { ...p };
}
function resolveInputRecommendation(catalog, key) {
  const rec = catalog.inputRecommendations?.[key];
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
    throw new Error(`openapi-config: inputRecommendations \xAB${key}\xBB no definido`);
  }
  const out = { ...rec };
  if (typeof out.fPreset === "string") {
    out.listFilter = resolveFPreset(catalog, out.fPreset);
    delete out.fPreset;
  }
  return out;
}
function resolveLookup(catalog, key) {
  const raw = catalog.lookups?.[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return void 0;
  const out = { ...raw };
  if (typeof out.fPreset === "string") {
    out.listFilter = resolveFPreset(catalog, out.fPreset);
    delete out.fPreset;
  }
  const recKey = out.inputRecommend;
  if (typeof recKey === "string") {
    delete out.inputRecommend;
    Object.assign(out, resolveInputRecommendation(catalog, recKey));
  }
  return out;
}
function enrichSchemaProperties(catalog, schema) {
  const props = schema.properties;
  if (!props) return schema;
  const nextProps = {};
  for (const [name, prop] of Object.entries(props)) {
    const ref = prop.inputRecommend;
    if (typeof ref === "string") {
      const { inputRecommend, ...rest } = prop;
      nextProps[name] = { ...rest, [ISS_INPUT_RECOMMENDATION_EXTENSION]: resolveInputRecommendation(catalog, ref) };
    } else {
      nextProps[name] = prop;
    }
  }
  return { ...schema, properties: nextProps };
}
function sg(id) {
  return { [ISS_SUBGROUP_EXTENSION]: id };
}
function resolvePayload(catalog, key) {
  const p = catalog.payloads?.[key];
  if (p === void 0) throw new Error(`openapi-config: payload \xAB${key}\xBB no definido`);
  return exampleOk(p);
}
function resolveSchema(catalog, key) {
  if (!key) return void 0;
  const s = catalog.schemas?.[key];
  if (!s) throw new Error(`openapi-config: schema \xAB${key}\xBB no definido`);
  return s;
}
function resolveExample(catalog, item) {
  if (item.example !== void 0) return item.example;
  if (item.payload) return resolvePayload(catalog, item.payload);
  return void 0;
}
function buildResponses(catalog, def) {
  switch (def.template) {
    case "health":
      if (!def.payload) throw new Error("openapi-config: health requiere payload");
      return issRspHealth(resolvePayload(catalog, def.payload));
    case "auth":
      if (!def.description || !def.payload) throw new Error("openapi-config: auth requiere description y payload");
      return issRspAuth(def.description, resolvePayload(catalog, def.payload), resolveSchema(catalog, def.schema));
    case "authForbidden":
      if (!def.description || !def.payload) throw new Error("openapi-config: authForbidden requiere description y payload");
      return issRspAuthForbidden(
        def.description,
        resolvePayload(catalog, def.payload),
        resolveSchema(catalog, def.schema)
      );
    case "authNotFound":
      if (!def.description || !def.payload) throw new Error("openapi-config: authNotFound requiere description y payload");
      return issRspAuthNotFound(
        def.description,
        resolvePayload(catalog, def.payload),
        resolveSchema(catalog, def.schema)
      );
    case "sse":
      if (!def.description || !def.payload) throw new Error("openapi-config: sse requiere description y payload");
      return issRspSseDoc(def.description, resolvePayload(catalog, def.payload));
    case "ok":
      if (!def.description || !def.payload) throw new Error("openapi-config: ok requiere description y payload");
      return { "200": issRspOk(def.description, resolvePayload(catalog, def.payload)) };
    case "deleteEnvelope": {
      if (!def.description || !def.payload) throw new Error("openapi-config: deleteEnvelope requiere description y payload");
      const rowSchema = resolveSchema(catalog, def.schema ?? "conversacionRow");
      return {
        "200": jsonResponse(
          def.description,
          {
            ...INSOFT_RESPONSE_SCHEMA,
            properties: {
              ...INSOFT_RESPONSE_SCHEMA.properties,
              respuesta: rowSchema
            }
          },
          resolvePayload(catalog, def.payload)
        ),
        "404": jsonResponse("Conversaci\xF3n no encontrada", INSOFT_ERROR_SCHEMA, EXAMPLE_404),
        "401": jsonResponse("No autorizado", INSOFT_ERROR_SCHEMA, EXAMPLE_401)
      };
    }
    case "raw": {
      if (!def.items) throw new Error("openapi-config: raw requiere items");
      const out = {};
      for (const [code, item] of Object.entries(def.items)) {
        out[code] = jsonResponse(item.description, item.schema ?? { type: "object" }, resolveExample(catalog, item));
      }
      return out;
    }
    default:
      throw new Error(`openapi-config: template de respuesta desconocido \xAB${def.template}\xBB`);
  }
}
function resolveParam(catalog, p) {
  if (p && typeof p === "object" && "template" in p && p.template === "iconversacionPath") {
    const lookupKey = String(p.lookup ?? "conversacion");
    const lookup = resolveLookup(catalog, lookupKey);
    return {
      name: "iconversacion",
      in: "path",
      required: true,
      schema: { type: "integer", minimum: 1, example: 4821 },
      description: p.description ?? "ID de conversaci\xF3n.",
      ...lookup ? { [ISS_LOOKUP_EXTENSION]: lookup } : {}
    };
  }
  const raw = { ...p };
  const listFilter = raw.listFilter;
  if (typeof listFilter === "string") {
    delete raw.listFilter;
    const meta = catalog.listFilters?.[listFilter];
    if (meta) raw[ISS_LIST_FILTER_EXTENSION] = enrichListFilterMeta(meta);
  }
  const inputRecommend = raw.inputRecommend;
  if (typeof inputRecommend === "string") {
    delete raw.inputRecommend;
    const rec = resolveInputRecommendation(catalog, inputRecommend);
    raw[ISS_INPUT_RECOMMENDATION_EXTENSION] = rec;
    if (raw.name === "f" && rec.listFilter && typeof rec.listFilter === "object") {
      raw.schema = { type: "string", example: encodeIssFilterB64(rec.listFilter) };
    }
  }
  return raw;
}
function buildOperation(catalog, def) {
  const op = {
    summary: def.summary,
    tags: def.tags
  };
  if (def.description) op.description = def.description;
  if (def.operationId) op.operationId = def.operationId;
  if (def.subgroup) Object.assign(op, sg(def.subgroup));
  if (def.security === "bearer") op.security = bearerSecurity;
  if (def.tryitConfirm !== void 0) op.tryitConfirm = def.tryitConfirm;
  if (def.doc) {
    const md = catalog.docs?.[def.doc];
    if (md) op[ISS_DOC_MD_EXTENSION] = md;
  }
  if (def.parameters?.length) {
    op.parameters = def.parameters.map((p) => resolveParam(catalog, p));
  }
  if (def.requestBodyExamples) {
    const presets = catalog.requestBodyExamples?.[def.requestBodyExamples];
    if (presets) op[ISS_REQUEST_BODY_EXAMPLES_EXTENSION] = presets;
  }
  if (def.requestBody) {
    const rb = def.requestBody;
    let example = rb.example;
    if (rb.bodyKey && catalog.requestBodies?.[rb.bodyKey]) {
      example = catalog.requestBodies[rb.bodyKey];
    }
    op.requestBody = jsonRequestBody(rb.description, enrichSchemaProperties(catalog, rb.schema), example ?? {});
  }
  op.responses = buildResponses(catalog, def.responses);
  return op;
}
function buildOpenApiFromConfig(config, serverUrl) {
  const base = serverUrl?.replace(/\/$/, "") || "/api";
  const catalog = config.catalog ?? {};
  const paths = {};
  for (const [path, methods] of Object.entries(config.paths)) {
    const item = {};
    for (const [method, opDef] of Object.entries(methods)) {
      item[method] = buildOperation(catalog, opDef);
    }
    paths[path] = item;
  }
  const tags = config.tags.map((t) => {
    const tag = { ...t };
    if (Array.isArray(tag.subgroups)) {
      tag[ISS_SUBGROUPS_EXTENSION] = tag.subgroups;
      delete tag.subgroups;
    }
    return tag;
  });
  return {
    openapi: config.openapi ?? "3.0.3",
    info: {
      title: config.info.title,
      description: config.info.description ?? "",
      version: config.info.version
    },
    servers: buildOpenApiServers(base),
    tags,
    components: { ...bearerComponents() },
    paths
  };
}

// server/docs.ts
var ISS_DOC_STANDARD = "DI-QA-001";
function buildApiInfoDescription(baseDesc, frontLink) {
  const panel = frontLink?.url ? `

**Panel:** [${frontLink.label}](${frontLink.url})` : "";
  return `${baseDesc.trim()}${panel}

## Est\xE1ndar de documentaci\xF3n (${ISS_DOC_STANDARD})

Documentaci\xF3n alineada con la gu\xEDa InSoft de APIs REST (adaptada de Postman a OpenAPI/Swagger).

### Autenticaci\xF3n global

Todas las rutas protegidas requieren **Bearer JWT** en el header \`Authorization\`.

\`\`\`http
Authorization: Bearer <JWT>
\`\`\`

Obtenga el token desde el panel superior (**Iniciar sesi\xF3n** / **Pegar JWT**) o exporte la colecci\xF3n Postman y use la variable \`{{token}}\`.

### Ambientes

| Ambiente | URL base |
|----------|----------|
| Local (ISS Functions) | \`http://127.0.0.1:8802/api\` |
| Web (staging Azure) | \`https://ayudascp-ia-staging.azurewebsites.net/api\` |

En Postman use \`{{base_url}}\` (activa), \`{{base_url_local}}\` o \`{{base_url_web}}\` seg\xFAn el ambiente.

### Convenciones globales

- **Fechas:** ISO 8601 (\`2026-06-19T15:30:00.000Z\`)
- **Respuestas JSON:** envelope InSoft \u2014 \`encabezado\` (metadatos) + \`respuesta\` (payload)
- **Errores:** \`encabezado.resultado = false\`, campos \`imensaje\` y \`mensaje\`
- **Variables Postman:** \`base_url\`, \`token\` (no hardcodear secretos en ejemplos)

### Exportar a Postman

Use el bot\xF3n **Exportar Postman** en la barra superior para descargar una colecci\xF3n v2.1 generada desde este OpenAPI (carpetas por tag, ejemplos de respuesta, auth Bearer).

### Exportar IS (InSoft)

Use el bot\xF3n **IS** en la barra superior para descargar o copiar el documento \`insoft.swagger-viewer\`: incluye la configuraci\xF3n del visor y la especificaci\xF3n embebida. Es el formato para inyectar la vista completa en el componente SwaggerViewer (no es OpenAPI ni Postman).
`.trim();
}
function buildTagFolderMarkdown(tagName, scope, operations) {
  const rows = operations.map((op) => `| ${op.method.toUpperCase()} | \`${op.path}\` | ${op.summary} |`).join("\n");
  return `# ${tagName}

## Alcance

${scope}

## Operaciones

| M\xE9todo | Ruta | Descripci\xF3n |
|--------|------|-------------|
${rows || "| \u2014 | \u2014 | Sin endpoints en esta carpeta |"}

## Autenticaci\xF3n

Las operaciones marcadas con seguridad en OpenAPI heredan **Bearer {{token}}** de la colecci\xF3n.
`.trim();
}

// server/postman.ts
var POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";
var HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];
var SKIP_PATHS = /* @__PURE__ */ new Set(["/swagger", "/swagger.json", "/swagger/postman.json", "/swagger/is.json"]);
var STATUS_PHRASE = {
  "200": "OK",
  "201": "Created",
  "204": "No Content",
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "409": "Conflict",
  "422": "Unprocessable Entity",
  "429": "Too Many Requests",
  "500": "Internal Server Error",
  "503": "Service Unavailable"
};
function asRecord(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}
function asArray(v) {
  return Array.isArray(v) ? v : [];
}
function randomId() {
  return "iss-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function stripApiPrefix(path) {
  if (path.startsWith("/api/")) return path.slice(4);
  if (path === "/api") return "/";
  return path;
}
function postmanPathSegments(openApiPath) {
  const clean = stripApiPrefix(openApiPath);
  const parts = clean.split("/").filter(Boolean);
  const segments = [];
  const variables = [];
  for (const part of parts) {
    const m = /^\{([^}]+)\}$/.exec(part);
    if (m) {
      segments.push(`:${m[1]}`);
      variables.push({ key: m[1], value: "", description: `Path parameter :${m[1]}` });
    } else {
      segments.push(part);
    }
  }
  return { segments, variables };
}
function extractJsonExample(media) {
  const m = asRecord(media);
  if (!m) return void 0;
  if (m.example !== void 0) return m.example;
  const examples = asRecord(m.examples);
  if (!examples) return void 0;
  for (const key of Object.keys(examples)) {
    const ex = asRecord(examples[key]);
    if (ex?.value !== void 0) return ex.value;
  }
  return void 0;
}
function sampleFromSchema(schema, depth = 0) {
  if (depth > 4) return null;
  const s = asRecord(schema);
  if (!s) return null;
  if (s.example !== void 0) return s.example;
  if (s.$ref && typeof s.$ref === "string") return {};
  const type = s.type;
  if (type === "object" || s.properties) {
    const props = asRecord(s.properties) ?? {};
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      out[k] = sampleFromSchema(v, depth + 1);
    }
    return out;
  }
  if (type === "array") return [sampleFromSchema(s.items, depth + 1)];
  if (type === "integer" || type === "number") return s.minimum ?? 1;
  if (type === "boolean") return false;
  if (type === "string") {
    if (s.format === "date-time") return "2026-06-19T15:30:00.000Z";
    return typeof s.example === "string" ? s.example : "string";
  }
  return null;
}
function paramTableMarkdown(parameters) {
  if (!parameters.length) return "";
  const rows = parameters.map((p) => {
    const pr = asRecord(p);
    if (!pr) return "";
    const req = pr.required ? "S\xED" : "No";
    const sch = asRecord(pr.schema);
    const type = String(sch?.type ?? pr.type ?? "string");
    const desc = String(pr.description ?? "").replace(/\|/g, "\\|");
    return `| \`${pr.name}\` | ${pr.in} | ${req} | ${type} | ${desc} |`;
  }).filter(Boolean);
  if (!rows.length) return "";
  return `### Par\xE1metros
| Nombre | Ubicaci\xF3n | Requerido | Tipo | Descripci\xF3n |
|--------|-----------|-----------|------|-------------|
${rows.join("\n")}`;
}
function responsesTableMarkdown(responses) {
  const rows = Object.entries(responses).map(([code, raw]) => {
    const r = asRecord(raw);
    const desc = String(r?.description ?? "").replace(/\|/g, "\\|");
    return `| ${code} | ${STATUS_PHRASE[code] ?? "\u2014"} | ${desc} |`;
  });
  if (!rows.length) return "";
  return `### Respuestas
| C\xF3digo | Estado | Descripci\xF3n |
|--------|--------|-------------|
${rows.join("\n")}`;
}
function buildRequestDescription(op, method, path) {
  const parts = [];
  const summary = String(op.summary ?? "").trim();
  const desc = String(op.description ?? "").trim();
  const docMd = String(op[ISS_DOC_MD_EXTENSION] ?? "").trim();
  if (summary) parts.push(`## ${summary}`);
  if (desc) parts.push(desc);
  if (docMd) parts.push(docMd);
  parts.push(`### M\xE9todo y ruta
\`${method.toUpperCase()} {{base_url}}${stripApiPrefix(path)}\``);
  const security = asArray(op.security);
  const needsAuth = security.length > 0 && !security.every((s) => Object.keys(s).length === 0);
  parts.push(`### Autorizaci\xF3n
${needsAuth ? "Requiere **Bearer JWT** en `Authorization` (`Bearer {{token}}`)." : "No requiere autenticaci\xF3n."}`);
  const params = asArray(op.parameters);
  const paramMd = paramTableMarkdown(params);
  if (paramMd) parts.push(paramMd);
  const requestBody = asRecord(op.requestBody);
  const rbContent = asRecord(requestBody?.content);
  const jsonBody = asRecord(rbContent?.["application/json"]);
  if (jsonBody) {
    const example = extractJsonExample(jsonBody) ?? sampleFromSchema(jsonBody.schema);
    parts.push(`### Body (application/json)
\`\`\`json
${JSON.stringify(example ?? {}, null, 2)}
\`\`\``);
  }
  const responses = asRecord(op.responses);
  if (responses) {
    const respMd = responsesTableMarkdown(responses);
    if (respMd) parts.push(respMd);
  }
  parts.push(`
---
*Generado desde OpenAPI \xB7 est\xE1ndar ${ISS_DOC_STANDARD}*`);
  return parts.join("\n\n").trim();
}
function buildPostmanUrl(baseUrlVar, openApiPath, parameters) {
  const { segments } = postmanPathSegments(openApiPath);
  const pathStr = segments.join("/");
  let raw = `${baseUrlVar}/${pathStr}`.replace(/([^:])\/{2,}/g, "$1/");
  const query = [];
  for (const p of parameters) {
    const pr = asRecord(p);
    if (!pr || pr.in !== "query") continue;
    const val = asRecord(pr.schema)?.example ?? "";
    query.push(`${encodeURIComponent(String(pr.name))}=${encodeURIComponent(String(val))}`);
  }
  if (query.length) raw += "?" + query.join("&");
  return raw;
}
function buildHeaders(method, parameters) {
  const headers = [
    { key: "Accept", value: "application/json", description: "Formato de respuesta" }
  ];
  if (method === "post" || method === "put" || method === "patch") {
    headers.push({
      key: "Content-Type",
      value: "application/json",
      description: "Tipo de contenido del body"
    });
  }
  for (const p of parameters) {
    const pr = asRecord(p);
    if (pr?.in === "header") {
      headers.push({
        key: String(pr.name),
        value: String(asRecord(pr.schema)?.example ?? ""),
        description: pr.description ? String(pr.description) : void 0
      });
    }
  }
  return headers;
}
function buildRequestBody(op) {
  const requestBody = asRecord(op.requestBody);
  const content = asRecord(requestBody?.content);
  const json = asRecord(content?.["application/json"]);
  if (!json) return void 0;
  const example = extractJsonExample(json) ?? sampleFromSchema(json.schema);
  return {
    mode: "raw",
    raw: JSON.stringify(example ?? {}, null, 2),
    options: { raw: { language: "json" } }
  };
}
function buildSavedResponses(op, method, path, parameters) {
  const responses = asRecord(op.responses);
  if (!responses) return [];
  const baseRequest = {
    method: method.toUpperCase(),
    header: buildHeaders(method, parameters),
    url: buildPostmanUrl("{{base_url}}", path, parameters),
    description: ""
  };
  const body = buildRequestBody(op);
  if (body) baseRequest.body = body;
  const out = [];
  for (const [code, raw] of Object.entries(responses)) {
    const r = asRecord(raw);
    if (!r) continue;
    const content = asRecord(r.content);
    const json = asRecord(content?.["application/json"]);
    const example = json ? extractJsonExample(json) : void 0;
    if (example === void 0) continue;
    const desc = String(r.description ?? STATUS_PHRASE[code] ?? code);
    const name = `${code} - ${desc}`.slice(0, 120);
    out.push({
      name,
      originalRequest: { ...baseRequest },
      status: STATUS_PHRASE[code] ?? "OK",
      code: Number.parseInt(code, 10) || 200,
      _postman_previewlanguage: "json",
      header: [{ key: "Content-Type", value: "application/json" }],
      body: JSON.stringify(example, null, 2)
    });
  }
  return out;
}
function buildRequestItem(method, path, op) {
  const parameters = asArray(op.parameters);
  const name = String(op.summary ?? `${method.toUpperCase()} ${stripApiPrefix(path)}`);
  const request = {
    method: method.toUpperCase(),
    header: buildHeaders(method, parameters),
    url: buildPostmanUrl("{{base_url}}", path, parameters),
    description: buildRequestDescription(op, method, path)
  };
  const body = buildRequestBody(op);
  if (body) request.body = body;
  const item = { name, request };
  const responses = buildSavedResponses(op, method, path, parameters);
  if (responses.length) item.response = responses;
  return item;
}
function collectOperations(spec) {
  const byTag = /* @__PURE__ */ new Map();
  const paths = asRecord(spec.paths) ?? {};
  const defaultTag = "General";
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (SKIP_PATHS.has(pathKey)) continue;
    const item = asRecord(pathItem);
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const op = asRecord(item[method]);
      if (!op) continue;
      const tags = asArray(op.tags);
      const tag = tags[0] ?? defaultTag;
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push({ op, method, path: pathKey });
    }
  }
  for (const list of byTag.values()) {
    list.sort((a, b) => {
      const pc = a.path.localeCompare(b.path);
      if (pc !== 0) return pc;
      return a.method.localeCompare(b.method);
    });
  }
  return byTag;
}
function tagDescription(spec, tagName, ops) {
  const tags = asArray(spec.tags);
  const found = tags.find((t) => t.name === tagName);
  const scope = found?.description ? String(found.description) : `Endpoints del dominio ${tagName}.`;
  return buildTagFolderMarkdown(tagName, scope, ops);
}
function collectionDescription(spec, opts) {
  const info = asRecord(spec.info) ?? {};
  const summary = opts.apiSummary ?? (info.description ? String(info.description) : "API REST documentada con OpenAPI.");
  const base = buildApiInfoDescription(summary, opts.frontLink ?? null);
  const serverNote = opts.absoluteBaseUrl ? `

**URL base al exportar:** \`${opts.absoluteBaseUrl}\`` : "";
  return `${base}${serverNote}
## Colecci\xF3n Postman
Importe este archivo en Postman. Configure \`base_url\` y \`token\` en las variables de la colecci\xF3n o en un entorno.
**Referencia:** ${ISS_DOC_STANDARD} \u2014 Gu\xEDa de buenas pr\xE1cticas para documentaci\xF3n de APIs.
`.trim();
}
function resolveBaseUrl(spec, absoluteBaseUrl) {
  if (absoluteBaseUrl) return absoluteBaseUrl.replace(/\/$/, "");
  const servers = asArray(spec.servers);
  const url = servers[0]?.url;
  if (typeof url === "string" && url.startsWith("http")) return url.replace(/\/$/, "");
  return "{{base_url}}";
}
function openApiToPostmanCollection(spec, opts = {}) {
  const info = asRecord(spec.info) ?? {};
  const title = String(info.title ?? "API");
  const baseUrl = resolveBaseUrl(spec, opts.absoluteBaseUrl);
  const byTag = collectOperations(spec);
  const items = [];
  const sortedTags = [...byTag.keys()].sort((a, b) => a.localeCompare(b));
  for (const tagName of sortedTags) {
    const entries = byTag.get(tagName) ?? [];
    const opSummaries = entries.map((e) => ({
      method: e.method.toUpperCase(),
      path: stripApiPrefix(e.path),
      summary: String(e.op.summary ?? e.path)
    }));
    const folderDesc = tagDescription(spec, tagName, opSummaries);
    items.push({
      name: tagName,
      description: folderDesc,
      item: entries.map((e) => buildRequestItem(e.method, e.path, e.op))
    });
  }
  return {
    info: {
      _postman_id: randomId(),
      name: title,
      description: collectionDescription(spec, opts),
      schema: POSTMAN_SCHEMA
    },
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{token}}", type: "string" }]
    },
    variable: [
      { key: "base_url", value: baseUrl, type: "string" },
      { key: "base_url_local", value: "http://127.0.0.1:8802/api", type: "string" },
      { key: "base_url_web", value: "https://ayudascp-ia-staging.azurewebsites.net/api", type: "string" },
      { key: "token", value: "", type: "string" }
    ],
    item: items
  };
}

// server/strip-export-extensions.ts
var STRIP_KEYS = /* @__PURE__ */ new Set([
  ISS_DOC_MD_EXTENSION,
  ISS_LOOKUP_EXTENSION,
  ISS_LIST_FILTER_EXTENSION,
  ISS_SUBGROUP_EXTENSION,
  ISS_SUBGROUPS_EXTENSION,
  ISS_REQUEST_BODY_EXAMPLES_EXTENSION,
  ISS_INPUT_RECOMMENDATION_EXTENSION,
  "subgroups"
]);
function stripNode(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripNode);
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (STRIP_KEYS.has(key)) continue;
    out[key] = stripNode(child);
  }
  return out;
}
function stripIsaExtensionsForExport(openApi) {
  return stripNode(openApi);
}

// server/viewer-pins.ts
var SWAGGER_VIEWER_GH_REPO = "Jeff-Aporta/swagger-viewer";
var SWAGGER_VIEWER_REF = "a367efd";
var SWAGGER_FRONT_SHARED_REF = "c97330e";

// server/orchestrator-auth.ts
var ORCHESTRATOR_URL_PROD = "https://main-orchestrator.jeffaporta.workers.dev";
var DEFAULT_AUTH_LOGIN_PATH = "/api/auth/token";
function resolveOrchestratorBase(_apiBase) {
  return ORCHESTRATOR_URL_PROD;
}
var AUTH_APP_ALIASES = { "swagger-viewer": "isa-patyia", "swagger-viewer-demo": "isa-patyia", ISS: "isa-patyia" };
function resolveAuthAppId(app) {
  const raw = String(app ?? "").trim();
  return AUTH_APP_ALIASES[raw] || raw || "isa-patyia";
}

// server/build-exports.ts
var IS_DOCUMENT_KIND = "insoft.swagger-viewer";
var IS_DOCUMENT_VERSION = 1;
var RUNTIME_VIEWER_KEYS = /* @__PURE__ */ new Set(["cssUrl", "stackUrl", "isaUrl", "appUrl", "specUrl", "url", "spec", "root", "exports", "loadMarked"]);
function viewerConfigFromBoot(config) {
  const out = {};
  for (const [k, v] of Object.entries(config)) {
    if (RUNTIME_VIEWER_KEYS.has(k) || v === void 0) continue;
    out[k] = v;
  }
  return out;
}
function prepareOpenApiConfig(raw) {
  const catalog = enrichListFilterCatalog(raw.catalog ?? {});
  return { ...raw, catalog: { ...raw.catalog, ...catalog } };
}
function resolveApiBase(serverUrl, absoluteBaseUrl) {
  const raw = (absoluteBaseUrl ?? serverUrl ?? "/api").replace(/\/$/, "");
  return raw;
}
function buildViewerRuntimeConfig(config, apiBase) {
  const v = config.viewer ?? {};
  const base = apiBase.replace(/\/$/, "");
  return {
    apiBase: base,
    configUrl: `${base}/swagger/config.json`,
    ns: v.ns ?? "ISA",
    app: v.app ?? "swagger-viewer",
    shell: v.shell ?? true,
    auth: {
      enabled: v.auth?.enabled ?? true,
      loginUrl: resolveOrchestratorBase(apiBase),
      loginKind: v.auth?.loginKind ?? "portal",
      loginPath: /portal-login|test-token/.test(String(v.auth?.loginPath ?? DEFAULT_AUTH_LOGIN_PATH)) ? DEFAULT_AUTH_LOGIN_PATH : v.auth?.loginPath ?? DEFAULT_AUTH_LOGIN_PATH,
      app: resolveAuthAppId(String(v.auth?.app ?? v.app ?? ""))
    },
    brand: v.brand ?? { title: config.info?.title ?? "API", icon: "mdi:api" },
    frontLinks: v.frontLinks ?? [],
    exports: {
      openApiDownloadName: v.exports?.openApiDownloadName ?? "openapi.json",
      postmanDownloadName: v.exports?.postmanDownloadName ?? "postman_collection.json",
      isDownloadName: v.exports?.isDownloadName ?? "api.is.json"
    },
    viewerRef: v.viewerRef ?? SWAGGER_VIEWER_REF,
    frontSharedRef: v.frontSharedRef ?? SWAGGER_FRONT_SHARED_REF,
    ...Array.isArray(v.nav) && v.nav.length ? { nav: v.nav } : {}
  };
}
function buildEmbedOpts(config, apiBase, viewer) {
  const v = config.viewer ?? {};
  const embed = v.embed ?? {};
  const exports = viewer.exports;
  return {
    apiBase,
    configUrl: viewer.configUrl,
    title: embed.title ?? config.info?.title ?? "API",
    authKind: embed.authKind ?? viewer.auth?.loginKind ?? "portal",
    authLoginUrl: viewer.auth?.loginUrl,
    authLoginPath: viewer.auth?.loginPath,
    brand: viewer.brand,
    ns: viewer.ns,
    app: viewer.app,
    shell: viewer.shell,
    frontLinks: viewer.frontLinks,
    exports,
    postmanDownloadName: exports?.postmanDownloadName,
    isDownloadName: exports?.isDownloadName,
    viewerRef: viewer.viewerRef,
    frontSharedRef: viewer.frontSharedRef,
    viewerRepo: SWAGGER_VIEWER_GH_REPO,
    localCdnBase: embed.localCdnBase
  };
}
function buildIsDocument(viewer, spec) {
  return { kind: IS_DOCUMENT_KIND, version: IS_DOCUMENT_VERSION, viewer: viewerConfigFromBoot(viewer), spec };
}
function buildIssExportsFromConfig(raw, opts = {}) {
  const config = prepareOpenApiConfig(raw);
  const serverUrl = opts.serverUrl ?? config.protocol?.serverUrl ?? "/api";
  const apiBase = resolveApiBase(serverUrl, opts.absoluteBaseUrl);
  const openApiFull = buildOpenApiFromConfig(config, serverUrl);
  const openApi = stripIsaExtensionsForExport(openApiFull);
  const frontLink = opts.frontLink ?? config.viewer?.frontLinks?.[0] ?? null;
  const postman = openApiToPostmanCollection(openApi, {
    absoluteBaseUrl: opts.absoluteBaseUrl ?? apiBase,
    apiSummary: opts.apiSummary ?? config.info?.description ?? config.info?.title,
    frontLink
  });
  const viewer = buildViewerRuntimeConfig(config, apiBase);
  const is = buildIsDocument(viewer, openApiFull);
  const embed = buildEmbedOpts(config, apiBase, viewer);
  return { config, openApi, postman, viewer, is, embed };
}
export {
  buildIssExportsFromConfig
};
