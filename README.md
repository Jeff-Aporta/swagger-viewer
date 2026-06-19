# Swagger Viewer (`@isa-components/swagger`)

Visor **OpenAPI 3** como app React + MUI + Iconify + CodeMirror, alineado con el stack de las apps front (`ISAFront`, `AppShell`, tema, toasts).

Solo necesitas pasar la especificación OpenAPI (objeto o URL) y opciones de marca/auth/export; el componente construye tabs por tag, ejemplos JSON, panel Doc (`x-iss-doc-md`), Try it out con JWT y exportaciones.

## Uso CDN (mínimo)

```html
<div id="root"></div>
<script type="importmap">{ /* react + mui — ver demo/index.html */ }</script>
<script>
  window.__SWAGGER_CONFIG__ = {
    specUrl: "/api/swagger.json",
    brand: { title: "Mi API", icon: "mdi:api" },
    auth: { enabled: true, loginUrl: "https://system-login.jeffaporta.workers.dev" },
    exports: {
      openApiUrl: "/api/swagger.json",
      postmanUrl: "/api/swagger/postman.json",
    },
  };
</script>
<script type="module">
  import { bootSwaggerApp } from "https://cdn.jsdelivr.net/gh/Jeff-Aporta/Personal@main/components/swagger/cdn/swagger-viewer.min.js";
  await bootSwaggerApp();
</script>
```

## API programática

```js
import { mountSwaggerViewer, bootSwaggerApp } from ".../swagger-viewer.min.js";

// Arranque completo (stack + ISAFront + CodeMirror)
await bootSwaggerApp({ specUrl: "/api/swagger.json", brand: { title: "API", icon: "mdi:api" } });

// Solo montar (stack ya cargado)
await mountSwaggerViewer({ spec: openApiObject, shell: true }, "#root");

// Global IIFE tras cargar el bundle
globalThis.ISAComponents.Swagger.bootSwaggerApp(config);
```

## Config (`__SWAGGER_CONFIG__` / primer argumento)

| Campo | Descripción |
|-------|-------------|
| `spec` | Objeto OpenAPI 3 |
| `specUrl` | URL del JSON (alternativa a `spec`) |
| `brand.title`, `brand.icon` | Marca en `AppShell` (meta `application-name` / `app-icon`) |
| `auth.loginUrl` | Base system-login para JWT de prueba |
| `auth.enabled` | `false` desactiva login |
| `exports.openApiUrl`, `exports.postmanUrl` | Enlaces de descarga |
| `frontLinks` | `[{ label, url }]` paneles GH Pages |
| `shell` | `false` omite `AppShell` (solo cuerpo) |
| `ns` | Namespace ISAFront (default `ISA`) |

## Extensiones ISS

- `x-iss-doc-md` en operación → pestaña **Doc** (Markdown vía `marked`)
- `x-iss-lookup` en parámetro → autocomplete contra API

## Build

```bash
cd components/swagger
npm run build
cd ../../apps/src/scripts
node front/gen-component-demo.mjs --component swagger
```

## Demo local

Servir `components/swagger/demo/` (p. ej. Live Server puerto 5500) o abrir tras `gen-component-demo`.

Parámetro `?spec=https://…/openapi.json` carga otra especificación.
