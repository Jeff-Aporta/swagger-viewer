/** Envelope JSON InSoft (encabezado + respuesta) — compartido entre specs OpenAPI. */

const TS = "2026-06-19T15:30:00.000Z";
const TS_OUT = "2026-06-19T15:30:00.042Z";

export const INSOFT_ENCABEZADO_OK = {
    resultado: true,
    tiempo: -1,
    fhentrada: TS,
    fhsalida: TS_OUT,
} as const;

export function insoftEncabezadoError(imensaje: number, mensaje: string) {
    return {
        resultado: false,
        tiempo: -1,
        fhentrada: TS,
        fhsalida: "2026-06-19T15:30:00.012Z",
        imensaje,
        mensaje,
    };
}

export function exampleOk(respuesta: unknown) {
    return {
        encabezado: INSOFT_ENCABEZADO_OK,
        respuesta,
    };
}

export const INSOFT_RESPONSE_SCHEMA = {
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
                mensaje: { type: "string" },
            },
        },
        respuesta: { type: "object" },
    },
} as const;

export const INSOFT_ERROR_SCHEMA = {
    type: "object",
    required: ["encabezado"],
    properties: {
        encabezado: INSOFT_RESPONSE_SCHEMA.properties.encabezado,
    },
} as const;

export const EXAMPLE_401 = {
    encabezado: insoftEncabezadoError(
        401020,
        'No se ha definido el parámetro de autenticación, por favor verifique que esté enviando el header, query o parámetro "authorization"',
    ),
};

export const EXAMPLE_403 = {
    encabezado: insoftEncabezadoError(403010, "No tiene permisos para acceder a este recurso."),
};

export const EXAMPLE_404 = {
    encabezado: insoftEncabezadoError(404010, "No se ha encontrado el recurso solicitado. "),
};

export const EXAMPLE_503 = {
    encabezado: insoftEncabezadoError(503010, "El servicio no está disponible temporalmente."),
};
