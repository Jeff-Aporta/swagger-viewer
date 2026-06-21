# Swagger Viewer (`@jeff-aporta/is-swagger`)

Visor **OpenAPI 3** como app React + MUI + Iconify + CodeMirror, alineado con el stack de las apps front (`ISAFront`, `AppShell`, tema, toasts).

**Repositorio privado** — distribución **solo por npm**. Los bundles del visor (`cdn/`) se sirven desde el host que instala el paquete (`GET /api/swagger/cdn/*` leyendo `node_modules`), no desde GitHub Pages ni jsDelivr del repo.

## Instalación

```bash
npm install @jeff-aporta/is-swagger
```

Requiere token npm con acceso al scope `@jeff-aporta` (paquete **restricted**). Ejemplo `.npmrc` local (no versionar):

```ini
@jeff-aporta:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

## Uso server (Azure Functions / workers)

```ts
import { issRspAuth, jsonRequestBody, bearerComponents } from "@jeff-aporta/is-swagger/server/spec";
import { exampleOk } from "@jeff-aporta/is-swagger/server/envelope";
import { openApiToPostmanCollection } from "@jeff-aporta/is-swagger/server/postman";
import { createRequire } from "node:module";

const requireIsSwagger = createRequire(__filename);
const { buildSwaggerUiHtml } = requireIsSwagger("@jeff-aporta/is-swagger/embed/build-html");
```

Exports: `./server/spec`, `./server/envelope`, `./server/docs`, `./server/postman`, `./server/viewer-pins`, `./embed/build-html`, `./lib/is-document`, `./cdn/*`.

## HTML embebido (producción)

`buildSwaggerUiHtml` genera una página que carga los assets desde **`{origin}/api/swagger/cdn/`** (mismo host que `swagger.json`). El backend debe exponer esos estáticos desde `node_modules/@jeff-aporta/is-swagger/cdn/` (ver `GET-SwaggerCdn` en ISS-AyudasCPIA).

## Config del visor (`__SWAGGER_CONFIG__`)

| Campo | Descripción |
|-------|-------------|
| `spec` | Objeto OpenAPI 3 |
| `specUrl` | URL del JSON |
| `brand.title`, `brand.icon` | Marca en `AppShell` |
| `auth.loginUrl` | Base system-login / portal para JWT de prueba |
| `exports.openApiUrl`, `exports.postmanUrl` | Enlaces de descarga |
| `shell` | `false` omite `AppShell` |

## Extensiones ISS

- `x-iss-doc-md` → pestaña **Doc** (Markdown)
- `x-iss-lookup` → autocomplete contra API
- `x-iss-input-recommendation` → endpoint + filtro recomendado

## Build y publicación

```bash
cd components/swagger
npm run build
npm run publish:restricted
```

El build sincroniza la versión en `server/viewer-pins.ts` y `cdn/versions.json`.

## Demo local

Servir `demo/` con Live Server (puerto 5500). Usa bundles en `demo/cdn/` (copia local del build). No hay demo pública en GitHub Pages.

```bash
npm run build
cd ../../apps/src/scripts
node front/gen-component-demo.mjs --component swagger
```

Parámetro `?spec=https://…/openapi.json` carga otra especificación.
