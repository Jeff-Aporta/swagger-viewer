# IS-Swagger demo — PROHIBICIÓN de simulaciones y JSONs quemados

> Estado: **vigente, no negociable**.
> Aplica al paquete `@ingenieria_insoft/ispsveltecomponents` → visor demo y sus
> derivados (GH Pages, embed ISS, ISAFront).

## TL;DR

El visor demo **siempre** se conecta a una API real viva. Está prohibido:

1. Quemar / hardcodear JSONs de spec, config, meta, paths, docs, testing o
   cualquier payload que se suponga venga del servidor.
2. Cargar specs desde `localStorage`, `IndexedDB`, archivos planos del repo,
   fixtures, mocks o respuestas simuladas cuando el flujo real está disponible.
3. Listas de presets de servidor con valores por defecto distintos del destino
   canónico (ISS PatyIA). El selector "Otro" / "Personalizado" desaparece — la
   conexión es siempre explícita vía URL.

## Conexión — única vía

| Origen                              | Aceptado | Notas |
|-------------------------------------|----------|-------|
| `?conn=<base64url>` (embed ISS)     | ✅       | Único formato oficial de autoconexión. |
| `?api=<URL>`                        | ✅       | Conexión explícita por query string. |
| Botón "Conectar con ISS PatyIA"     | ✅       | Abre modal `PatyIaEnvDialog` (Local/Prod) → redirige con `?conn=`. |
| Input "Otra API ISS" + botón Cargar | ✅       | URL libre → `?conn=` con `apiBase`. |
| `localStorage` / último usado       | ❌       | Eliminado. El visor no recuerda bases. |
| Preset por defecto del host         | ❌       | Eliminado. `DEFAULT_API_SCOPES = []`. |
| `resolveConnectBases` con fallbacks | ❌       | Eliminado en demo. Solo el primer base ?conn= / ?api=. |
| `welcomeCustom`/`drawer` como atajo | ❌       | Eliminado. El Welcome solo expone ISS PatyIA + otra API manual. |

## Componentes tocados

- `demo/js/app/WelcomeScreen.jsx` — único botón: "Conectar con ISS PatyIA".
- `demo/js/app/App.jsx` — `resolveInitialBases` solo con `?conn=` o `?api=`.
  Sin `readStoredApiBase`, sin fallback a `ISS_WEB_API_BASE`/`ISS_LOCAL_API_BASE`,
  sin presets.
- `demo/js/app/ApiBaseSelect.jsx` — TextField URL directo + botón Conectar.
  Sin `ServerScopeSelect`, sin presets, sin "Otro".
- `demo/js/app/IsEditorDrawer.jsx` — pasa `fixedServer` para impedir edición
  del host cuando `?conn=…` fija el servidor.
- `src/lib/api/api-presets.js` — `DEFAULT_API_SCOPES = []`,
  `ISS_PATYIA_API_BASE` exportado como destino único del Welcome.
- `server/api-presets.ts` — espejo TS con la misma regla.

## Auditoría rápida (debe pasar)

```bash
# 1. No quedan presets que simulen hosts.
rg -n 'DEFAULT_API_SCOPES|DEMO_API_SCOPES|ISS_WEB_API_BASE|readStoredApiBase|storeApiBase|resolveConnectBases' apps/components/swagger/demo
# Resultado esperado: solo referencias en api-presets.js (DEFAULT_API_SCOPES = []).

# 2. No se importan ServerScopeSelect ni DEMO_API_SCOPES desde el demo.
rg -n 'ServerScopeSelect|DEMO_API_SCOPES' apps/components/swagger/demo

# 3. Welcome expone únicamente el botón ISS PatyIA.
rg -n 'onOpenEditor|onConnectCustom' apps/components/swagger/demo/js/app/WelcomeScreen.jsx
# Resultado esperado: 0 coincidencias.
```

## Excepciones

Ninguna en demo. Si necesitas un visor de testing offline, usa otro componente
(`SwaggerViewer` puro con `config.exports.openApiUrl`) — ese flujo nunca pasa
por el demo embebido.