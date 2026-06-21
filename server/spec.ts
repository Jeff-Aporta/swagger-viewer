/**
 * Utilidades OpenAPI compartidas — extensiones, builders JSON, respuestas InSoft.
 */

import {
    EXAMPLE_401,
    EXAMPLE_403,
    EXAMPLE_404,
    EXAMPLE_503,
    INSOFT_ERROR_SCHEMA,
    INSOFT_RESPONSE_SCHEMA,
    exampleOk,
} from "./envelope.js";

export const ISS_DOC_MD_EXTENSION = "x-iss-doc-md";
export const ISS_LOOKUP_EXTENSION = "x-iss-lookup";
export const ISS_LIST_FILTER_EXTENSION = "x-iss-list-filter";
export const ISS_SUBGROUP_EXTENSION = "x-isa-subgroup";
export const ISS_SUBGROUPS_EXTENSION = "x-isa-subgroups";
export const ISS_REQUEST_BODY_EXAMPLES_EXTENSION = "x-iss-request-body-examples";
export const ISS_INPUT_RECOMMENDATION_EXTENSION = "x-iss-input-recommendation";

export const jsonResponse = (
    description: string,
    schema: Record<string, unknown> = { type: "object" },
    example?: unknown,
) => {
    const media: Record<string, unknown> = { schema };
    if (example !== undefined) media.example = example;
    return {
        description,
        content: { "application/json": media },
    };
};

export const jsonRequestBody = (
    description: string,
    schema: Record<string, unknown>,
    example: unknown,
    required = true,
) => ({
    required,
    description,
    content: {
        "application/json": {
            schema,
            example,
        },
    },
});

export const bearerSecurity = [{ Bearer: [] as string[] }];

export function bearerComponents() {
    return {
        securitySchemes: {
            Bearer: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description:
                    "Token de acceso. Pide uno de prueba con el botón superior o pega el tuyo en Authorize.",
            },
        },
    };
}

function okSchema(respuestaSchema: Record<string, unknown> = { type: "object" }) {
    return {
        ...INSOFT_RESPONSE_SCHEMA,
        properties: {
            ...INSOFT_RESPONSE_SCHEMA.properties,
            respuesta: respuestaSchema,
        },
    };
}

export function issRspOk(
    description: string,
    example: unknown,
    respuestaSchema: Record<string, unknown> = { type: "object" },
) {
    return jsonResponse(description, okSchema(respuestaSchema), example);
}

export const issRsp401 = () => jsonResponse("No autorizado", INSOFT_ERROR_SCHEMA, EXAMPLE_401);
export const issRsp403 = () => jsonResponse("Prohibido", INSOFT_ERROR_SCHEMA, EXAMPLE_403);
export const issRsp404 = () => jsonResponse("No encontrado", INSOFT_ERROR_SCHEMA, EXAMPLE_404);
export const issRsp503 = () => jsonResponse("Servicio no disponible", INSOFT_ERROR_SCHEMA, EXAMPLE_503);

export function issRspAuth(
    okDesc: string,
    example: unknown,
    respuestaSchema?: Record<string, unknown>,
) {
    return {
        "200": issRspOk(okDesc, example, respuestaSchema),
        "401": issRsp401(),
    };
}

export function issRspAuthForbidden(
    okDesc: string,
    example: unknown,
    respuestaSchema?: Record<string, unknown>,
) {
    return {
        "200": issRspOk(okDesc, example, respuestaSchema),
        "401": issRsp401(),
        "403": issRsp403(),
    };
}

export function issRspAuthNotFound(
    okDesc: string,
    example: unknown,
    respuestaSchema?: Record<string, unknown>,
) {
    return {
        "200": issRspOk(okDesc, example, respuestaSchema),
        "401": issRsp401(),
        "404": issRsp404(),
    };
}

export function issRspHealth(healthExample?: unknown) {
    const example =
        healthExample ??
        exampleOk({
            ok: true,
            service: "api",
            authMode: "worker",
        });
    return {
        "200": issRspOk("Servicio operativo", example, { type: "object" }),
        "503": issRsp503(),
    };
}

export function issRspSseDoc(okDesc: string, example: unknown) {
    return {
        "200": {
            description: okDesc,
            content: {
                "text/event-stream": {
                    schema: { type: "string" },
                    example: `data: ${JSON.stringify(example)}\n\n`,
                },
                "application/json": {
                    schema: okSchema(),
                    example,
                },
            },
        },
        "401": issRsp401(),
    };
}
