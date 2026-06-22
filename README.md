# Swagger Viewer (`@jeff-aporta/is-swagger`)

Visor **OpenAPI 3** como app React + MUI + Iconify + CodeMirror, alineado con el stack ISA (`ISAFront`, `AppShell`, tema, toasts).

## Distribución: CDN primero

El visor es **100 % front**. Los hosts (ISS-AyudasCPIA, etc.) **no necesitan** `npm install @jeff-aporta/is-swagger`.

| Artefacto | Uso |
|-----------|-----|
| `cdn/swagger-viewer.min.js` | Boot + `bootSwaggerApp` |
| `cdn/swagger-viewer-app.min.js` | Chunk React del visor |
| `cdn/swagger-viewer.min.css` | Estilos (neon-glass + swagger) |
| `cdn/embed-boot.mjs` | Arranque embebido (hosts) |
| `cdn/embed-index.html` | Plantilla HTML (referencia) |
| `cdn/vendor/iss-exports.cjs` | OpenAPI / Postman / IS (Node, sin npm) |
| `cdn/vendor/build-html.cjs` | HTML embebido para `GET /api/swagger` |

### jsDelivr (pin por versión)

```
https://cdn.jsdelivr.net/gh/Jeff-Aporta/swagger-viewer@0.1.18/cdn/swagger-viewer.min.js
```

### Mismo host (`GET /api/swagger/cdn/*`)

Copia `cdn/` al repo del host (`src/lib/is-swagger/cdn/`) con `scripts/copy-swagger-vendor.mjs` en ISS.

## HTML embebido (producción)

`buildSwaggerUiHtml` (en `cdn/vendor/build-html.cjs`) genera una página al estilo **isa-patyia**:

- Meta OG, favicon Iconify, `AppMeta`, boot screen neon
- `front-shared` vía jsDelivr
- Visor desde `/api/swagger/cdn/` o jsDelivr pin
- `window.__SWAGGER_CONFIG__` inyectado por el host

## npm (opcional)

El paquete npm sigue publicándose para quien prefiera `import` server-side, pero **no es requerido** para ISS ni para el runtime del visor.

```bash
npm install @jeff-aporta/is-swagger  # opcional
```

## ISS-AyudasCPIA (sin dependencia npm)

```bash
# En swagger-viewer
npm run build

# En ISS-AyudasCPIA
node scripts/copy-swagger-vendor.mjs
npm run build
```

`GET /api/swagger` sirve HTML; `GET /api/swagger/cdn/*` sirve assets desde `src/lib/is-swagger/cdn/`.

## Config del visor (`__SWAGGER_CONFIG__`)

| Campo | Descripción |
|-------|-------------|
| `specUrl` | URL del JSON OpenAPI |
| `viewerCdnBase` | Base CDN del visor |
| `brand.title`, `brand.icon` | Marca en `AppShell` |
| `auth.loginUrl` | Base portal / system-login para JWT |
| `exports.*` | Enlaces de descarga |

## Build

```bash
cd components/swagger
npm run build
```

Genera CDN, `embed-boot.mjs`, bundles `cdn/vendor/*.cjs` y (opcional) `dist/server/*` para npm.

## Demo local

Servir `demo/` con Live Server. Usa `demo/cdn/` o ruta local al build.

```bash
npm run build
```

Parámetro `?spec=https://…/openapi.json` carga otra especificación.
