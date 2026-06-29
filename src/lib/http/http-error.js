/** Mensajes legibles para respuestas HTTP fallidas (login, lookups, etc.). */

const STATUS_LABELS = {
  400: "Solicitud incorrecta",
  401: "No autorizado",
  403: "Acceso prohibido",
  404: "Ruta no encontrada",
  405: "Método no permitido",
  408: "Tiempo de espera agotado",
  409: "Conflicto",
  413: "Cuerpo demasiado grande",
  415: "Tipo de contenido no soportado",
  422: "Datos no válidos",
  429: "Demasiadas peticiones",
  500: "Error interno del servidor",
  502: "Puerta de enlace incorrecta",
  503: "Servicio no disponible",
  504: "Tiempo de espera del servidor",
};

const LOGIN_HINTS = {
  401: "Revisa correo y contraseña.",
  403: "No tienes permiso para autenticarte en este servicio.",
  404: "La ruta de login no existe. Verifica auth.loginPath en el documento IS.",
  405: "El servidor no acepta POST en esa URL. Si el visor está en otro host que la API, define auth.loginUrl (p. ej. http://localhost:5502).",
  429: "Espera unos segundos antes de reintentar.",
  502: "El backend no pudo completar el login (servicio externo caído o mal configurado).",
  503: "El servicio de autenticación no está disponible temporalmente.",
};

const SWAGGER_PUT_HINTS = {
  400: "El body debe ser un documento JSON con kind «insoft.openapi-config» válido.",
  401: "Su usuario no está autorizado: requiere rol documentador (SYS_USR_PERMISSIONS) junto con dev_lead. Inicie sesión con un usuario autorizado.",
  403: "Acceso prohibido para actualizar la config IS-Swagger con este perfil.",
  404: "El servidor no expone PUT /api/system/swagger.json (ruta inexistente o ISS sin desplegar). Pruebe staging (ayudascp-ia-staging) o despliegue reciente; no confunda con GET /system/swagger/config.json.",
  405: "Este host no acepta PUT en /api/system/swagger.json.",
  500: "El ISS falló al guardar SYS_VALUES.swagger. Revise logs del Function App.",
};

export function extractApiError(data) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  const enc = data.encabezado;
  if (enc && typeof enc.mensaje === "string" && enc.mensaje.trim()) return enc.mensaje.trim();
  return "";
}

export function formatHttpError(status, opts = {}) {
  const code = Number(status) || 0;
  const label = STATUS_LABELS[code] || "Error HTTP";
  const statusText = opts.statusText ? ` ${String(opts.statusText).trim()}` : "";
  const lines = [`${label} (${code}${statusText}).`];
  const detail = opts.detail || extractApiError(opts.data);
  if (detail) lines.push(detail);
  if (opts.endpoint) lines.push(`URL: ${opts.endpoint}`);
  const hint =
    opts.hint ??
    (opts.context === "login"
      ? LOGIN_HINTS[code]
      : opts.context === "swagger-put"
        ? SWAGGER_PUT_HINTS[code]
        : opts.defaultHint);
  if (hint) lines.push(hint);
  return lines.join("\n");
}

export function formatLoginError(res, data, endpoint) {
  const apiMsg = extractApiError(data);
  if (apiMsg && (data?.ok === false || !res.ok)) {
    let msg = apiMsg;
    if (data?.retryAfterSeconds) msg += ` (reintenta en ${data.retryAfterSeconds} s)`;
    return msg;
  }
  if (res.ok && !data?.token) {
    return formatHttpError(502, {
      detail: "La respuesta no incluyó token JWT.",
      endpoint,
      context: "login",
    });
  }
  return formatHttpError(res.status, {
    statusText: res.statusText,
    data,
    endpoint,
    context: "login",
  });
}
