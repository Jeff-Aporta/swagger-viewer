# IS-Swagger (swagger-viewer)

Visor **OpenAPI 3** como app React + MUI + Iconify + CodeMirror, alineado con el stack ISA (`ISAFront`, `AppShell`, tema, toasts).

## Distribución: solo CDN

El visor es **100 % front**. No hay paquete npm: todo se consume por **jsDelivr** (pin git) o copiando `cdn/` al host.

| Artefacto | Uso |
|-----------|-----|
| `cdn/swagger-viewer.min.js` | Boot + `bootSwaggerApp` |
| `cdn/swagger-viewer-app.min.js` | Chunk React del visor |
| `cdn/swagger-viewer.min.css` | Estilos (neon-glass + swagger) |
| `cdn/embed-boot.mjs` | Arranque embebido (hosts) |
| `cdn/embed-index.html` | Plantilla HTML (referencia) |
| `cdn/vendor/iss-exports.cjs` | OpenAPI / Postman / IS (Node) |
| `cdn/vendor/build-html.cjs` | HTML embebido para `GET /api/swagger` |

### jsDelivr (pin por ref git)

```
https://cdn.jsdelivr.net/gh/Jeff-Aporta/swagger-viewer@<componentRef>/cdn/swagger-viewer.min.js
```

El pin vive en `cdn/versions.json` (`componentRef`). Actualizar con `sync-all-versions.mjs --from-git`.

### Mismo host (`GET /api/swagger/cdn/*`)

Copia `cdn/vendor/` y `embed-index.html` al repo del host con `scripts/sync-swagger-embed.mjs` en ISS.

## HTML embebido (producción)

`buildSwaggerUiHtml` (en `cdn/vendor/build-html.cjs`) genera una página al estilo **isa-patyia**:

- Meta OG, favicon Iconify, `AppMeta`, boot screen neon
- `front-shared` vía jsDelivr
- Visor desde `/api/swagger/cdn/` o jsDelivr pin
- `window.__SWAGGER_CONFIG__` inyectado por el host

## ISS-AyudasCPIA

```bash
# En components/swagger
npm run build

# En ISS-AyudasCPIA
node scripts/sync-swagger-embed.mjs
npm run build
```

`GET /api/swagger` sirve HTML; `GET /api/swagger/cdn/*` sirve assets desde el worker/host.

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

Genera bundles CDN y `cdn/vendor/*.cjs` para hosts Node.

## Demo local

Servir `demo/` con Live Server. Usa `demo/cdn/` o ruta local al build.

Parámetro `?spec=https://…/openapi.json` carga otra especificación.
