/** Documentación OpenAPI genérica — DI-QA-001, info y carpetas Postman. */

export const ISS_DOC_STANDARD = "DI-QA-001";

export type FrontLink = { label: string; url: string };

export type IssDocOperation = {
    method: string;
    path: string;
    summary: string;
};

export function buildApiInfoDescription(baseDesc: string, frontLink: FrontLink | null): string {
    const panel = frontLink?.url
        ? `\n\n**Panel:** [${frontLink.label}](${frontLink.url})`
        : "";
    return `${baseDesc.trim()}${panel}

## Estándar de documentación (${ISS_DOC_STANDARD})

Documentación alineada con la guía InSoft de APIs REST (adaptada de Postman a OpenAPI/Swagger).

### Autenticación global

Todas las rutas protegidas requieren **Bearer JWT** en el header \`Authorization\`.

\`\`\`http
Authorization: Bearer <JWT>
\`\`\`

Obtenga el token desde el panel superior (**Iniciar sesión** / **Pegar JWT**) o exporte la colección Postman y use la variable \`{{token}}\`.

### Ambientes

| Ambiente | URL base |
|----------|----------|
| Local (Functions) | \`http://localhost:5502/api\` |
| Azure / despliegue | URL del Function App + \`/api\` |

En Postman configure \`{{base_url}}\` según el ambiente.

### Convenciones globales

- **Fechas:** ISO 8601 (\`2026-06-19T15:30:00.000Z\`)
- **Respuestas JSON:** envelope InSoft — \`encabezado\` (metadatos) + \`respuesta\` (payload)
- **Errores:** \`encabezado.resultado = false\`, campos \`imensaje\` y \`mensaje\`
- **Variables Postman:** \`base_url\`, \`token\` (no hardcodear secretos en ejemplos)

### Exportar a Postman

Use el botón **Exportar Postman** en la barra superior para descargar una colección v2.1 generada desde este OpenAPI (carpetas por tag, ejemplos de respuesta, auth Bearer).

### Exportar IS (InSoft)

Use el botón **IS** en la barra superior para descargar o copiar el documento \`insoft.swagger-viewer\`: incluye la configuración del visor y la especificación embebida. Es el formato para inyectar la vista completa en el componente SwaggerViewer (no es OpenAPI ni Postman).
`.trim();
}

export function buildTagFolderMarkdown(
    tagName: string,
    scope: string,
    operations: IssDocOperation[],
): string {
    const rows = operations
        .map((op) => `| ${op.method.toUpperCase()} | \`${op.path}\` | ${op.summary} |`)
        .join("\n");
    return `# ${tagName}

## Alcance

${scope}

## Operaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
${rows || "| — | — | Sin endpoints en esta carpeta |"}

## Autenticación

Las operaciones marcadas con seguridad en OpenAPI heredan **Bearer {{token}}** de la colección.
`.trim();
}
