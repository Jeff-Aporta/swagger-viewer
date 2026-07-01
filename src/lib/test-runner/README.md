# Test runner del visor IS-Swagger

Runner agnóstico de tests `insoft.client-testing`. Server solo datos
(`GET/PUT /api/system/testing.json`); runner 100% cliente en este visor.

Antes de ejecutar steps, `runTest()` hace **GET público**
`/api/system/config/conversacion` y expone
`vars.recalcularTituloCadaMensajesUsuario` (default 3) para el juez
y el fallback de verdict.

## Formato del payload

```json
{
  "kind": "insoft.client-testing",
  "version": 1,
  "tests": [
    {
      "id": "title-change",
      "title": "Cambio de título en conversaciones",
      "description": "...",
      "tags": ["Testing"],
      "subgroup": "pruebas",
      "docs": "...",
      "steps": [
        { "kind": "conv", "description": "...", "prompt": "..." },
        ...
        { "kind": "script", "run": "<código JS del juez>" }
      ]
    }
  ]
}
```

## Step kinds

| kind    | Campos                                  | Descripción |
|---------|----------------------------------------|-------------|
| `conv`  | `prompt`, `description`                 | Envía `POST /api/conversacion`. El primer step SIN `iconversacion` crea conversación; los siguientes reusan el `iconversacion` capturado del SSE. Captura `titulo` y detecta cambios. |
| `http`  | `method`, `path`, `body`, `expectStatus`, `expectField`, `expectMatches`, `extract` | HTTP genérico. Soporta interpolación `{{var}}` desde `ctx.vars`. |
| `raw`   | igual que `http`                         | Igual que `http` sin abstracciones de alto nivel. |
| `script`| `run`, `timeoutMs`                      | JS ejecutado con sandbox restringido. Acceso a `ctx.vars`, `ctx._trace`, `ctx.steps`, `ctx.iconversacion`, `ctx.lastTitulo`. Retornar `{ verdict }` para influir el verdict final. |

## Estado entre steps

El runner mantiene `RunnerContext`:
- `vars` — outputs explícitos (`{iconversacion, titulo, ...}`).
- `trace` — runtime libre del test (logs del runner).
- `_trace` — convenciones del juez:
  - `messages: number` — total de steps `conv` ejecutados.
  - `titleChangesSoFar: Array<{afterMessage, from, to}>` — cambios de título detectados.
- `steps` — `StepResult[]` con un entry por step.

Interpolación `{{nombre}}` resuelve desde `ctx.vars` en strings, arrays y objetos.

## Verdict

```ts
type Verdict = {
  pass: boolean;
  reason: string;
  totalMessages: number;
  titleChanges: number;
  expectedMinChanges: number;
  changesTimeline: Array<{afterMessage, from, to}>;
  steps: StepResult[];
  startedAt: string;
  endedAt: string;
  duration: number; // ms
}
```

Si el último step es `script` y retorna `{ verdict }`, ese verdict reemplaza al calculado por defecto.

## Uso programático

```js
import { runTest, formatVerdict } from "./src/lib/test-runner/index.mjs";

const payload = await fetch(`${apiBase}/system/testing.json`).then((r) => r.json());
const test = payload.tests.find((t) => t.id === "title-change");

const verdict = await runTest(test, {
  apiBase: "https://ayudascp-ia-staging.azurewebsites.net/api",
  jwt: "<opcional>",
  onStep: (s) => console.log(s),
});

console.log(formatVerdict(verdict, { verbose: true, color: true }));
process.exit(verdict.pass ? 0 : 1);
```

## CLI

```bash
node src/lib/test-runner/run-against.mjs \
  https://ayudascp-ia-staging.azurewebsites.net/api \
  title-change \
  "<jwt-opcional>"
```

Exit 0 si PASS, 1 si FAIL.

## Smoke tests

```bash
node src/lib/test-runner/smoke-runner.mjs        # SSE parser + state machine
node src/lib/test-runner/smoke-exact-backend.mjs  # Exact backend format + iconv reuso
```

Ambos tests usan fetch mockeado; **no tocan staging**.

## UI

El componente React `src/components/testing/TestingAccordion.jsx` se renderiza en la pestaña
secundaria **Testing** del visor (cuando `viewer.nav` incluye un tab con `tags: ["Testing"]`).
de los `OperationTagGroup` en `SwaggerViewer.jsx`. Cada test es un acordeón con
título, subtítulo (# steps), chip PASS/FAIL, botón Ejecutar, log incremental de
steps y alert final con el verdict formateado.
