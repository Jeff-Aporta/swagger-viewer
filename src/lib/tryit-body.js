/** Try it out — body JSON editable (spec o fallback por operación). */

import { extractJsonExample, jsonPretty } from "./openapi.js";

export const BODY_HTTP_METHODS = new Set(["post", "put", "patch"]);
export const ISS_REQUEST_BODY_EXAMPLES_EXT = "x-iss-request-body-examples";

const FALLBACK_BODY_BY_OP = {
  "post /conversacion": {
    prompt: "¿Cómo creo una factura en ContaPyme?",
    imodulo: "CP-IA",
    iconversacion: 4821,
  },
  "post /mensaje": {
    iconversacion: 4821,
    imensaje: 2,
    butil: true,
    contenido: "La respuesta fue clara y útil.",
  },
  "post /tiquete": {
    iconversacion: 4821,
    codigotk: "TK-1436238",
    tema: "Consulta saldo cartera",
    bcerrar_conversacion: false,
    bautoriza_visualizacion: true,
  },
};

const FALLBACK_BODY_EXAMPLES_BY_OP = {
  "post /conversacion": [
    {
      id: "basico",
      label: "Mensaje básico",
      icon: "mdi:message-text-outline",
      example: FALLBACK_BODY_BY_OP["post /conversacion"],
    },
    {
      id: "nueva",
      label: "Nueva conversación",
      icon: "mdi:chat-plus-outline",
      example: {
        prompt: "¿Cómo registro un tercero en ContaPyme?",
        imodulo: "CP-IA",
      },
    },
    {
      id: "imagenes",
      label: "Con imágenes",
      icon: "mdi:image-multiple-outline",
      example: {
        prompt: "¿Qué datos fiscales aparecen en esta factura adjunta?",
        imodulo: "CP-IA",
        iconversacion: 4821,
        imagenes: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Simple_invoice_example.png/320px-Simple_invoice_example.png",
        ],
      },
    },
    {
      id: "continuar-nomina",
      label: "Consulta nómina",
      icon: "mdi:file-document-outline",
      example: {
        prompt: "Usando la documentación de nómina, ¿cómo registro un pago de nómina para un empleado?",
        imodulo: "CP-IA",
        iconversacion: 4821,
      },
    },
  ],
  "post /mensaje": [
    {
      id: "util",
      label: "Útil",
      icon: "mdi:thumb-up-outline",
      example: FALLBACK_BODY_BY_OP["post /mensaje"],
    },
    {
      id: "no-util",
      label: "No útil",
      icon: "mdi:thumb-down-outline",
      example: {
        iconversacion: 4821,
        imensaje: 2,
        butil: false,
        contenido: "La respuesta no resolvió mi duda.",
      },
    },
  ],
  "post /tiquete": [
    {
      id: "asociar",
      label: "Asociar tiquete",
      icon: "mdi:ticket-outline",
      example: FALLBACK_BODY_BY_OP["post /tiquete"],
    },
    {
      id: "cerrar",
      label: "Asociar y cerrar",
      icon: "mdi:ticket-confirmation-outline",
      example: {
        ...FALLBACK_BODY_BY_OP["post /tiquete"],
        bcerrar_conversacion: true,
        tema: "Escalamiento a soporte humano",
      },
    },
  ],
};

export function opUsesRequestBody(method) {
  return BODY_HTTP_METHODS.has(String(method || "").toLowerCase());
}

export function opBodyKey(op) {
  return `${String(op?.method || "").toLowerCase()} ${op?.path || ""}`.trim();
}

export function resolveTryItBodyExample(op) {
  const fromSpec = extractJsonExample(op?.requestBody?.content?.["application/json"]);
  if (fromSpec !== undefined) return fromSpec;
  const ext = op?.["x-iss-request-body"]?.example;
  if (ext !== undefined) return ext;
  return FALLBACK_BODY_BY_OP[opBodyKey(op)];
}

export function resolveTryItBodyExamples(op) {
  const fromSpec = op?.[ISS_REQUEST_BODY_EXAMPLES_EXT];
  if (Array.isArray(fromSpec) && fromSpec.length) {
    return fromSpec.filter((item) => item && typeof item === "object" && item.example !== undefined);
  }
  return FALLBACK_BODY_EXAMPLES_BY_OP[opBodyKey(op)] || [];
}

export function formatBodyExample(example) {
  return example !== undefined ? jsonPretty(example) : "{\n  \n}";
}

export function defaultTryItBodyText(op) {
  return formatBodyExample(resolveTryItBodyExample(op));
}

export function shouldShowTryItBody(op) {
  return opUsesRequestBody(op?.method);
}
