# Test runner del visor IS-Swagger

Runner **agnóstico al servidor**. Server solo provee datos
(`GET /api/system/testing.json`); el runner es 100% cliente y declara qué
necesita (`requires`), qué corre (`steps`/`cases`) y qué muestra
(`metrics`/`tools`/`table`).

Forma canónica: [`test.schema.json`](./test.schema.json) (Draft 2020-12).

## Test interface

```jsonc
{
  "kind": "testing",
  "tests": [
    {
      "id": "title-change",
      "title": "Cambio de título en conversaciones",
      "description": "...",
      "tags": ["Testing"],
      "subgroup": "pruebas",
      "docs": "markdown libre",

      "requires": {
        "apis": {
          "default": { "auth": ["/conversacion", "/conversacion/logs/{id}"] }
          // apiRef custom → multi-server / JWT por server
        },
        "config": ["config/conversacion"]   // claves GET públicas pre-cargadas
      },

      "setup": {
        "timeoutMs": 5000,
        "fetch": [
          { "method": "GET", "path": "/system/config/conversacion", "var": "_cfg" }
        ],
        "init": "ctx._trace = { titleHistory: [] }"
      },

      "cases": [
        { "id": "happy", "params": { "expect": "OK", "model": "gpt-5-mini" } }
      ],
      "casesMode": "each", // "each" | "matrix" | "single"

      "steps": [
        { "kind": "stream", "prompt": "hola", "extract": { "iconversacion": "iconversacion" } },
        { "kind": "http",   "method": "GET", "path": "/conversacion/logs/{{iconversacion}}", "expect": { "status": 200 } },
        { "kind": "script", "run": "return { verdict: { pass: true } };" }
      ],

      "metrics": [
        { "key": "title_changes", "label": "Cambios", "format": "count", "compute": "ctx._trace.titleHistory.length" }
      ],
      "tools":    [ { "kind": "timeline", "id": "th", "title": "Historia", "source": "ctx._trace.titleHistory" } ],
      "table":    { "title": "Mensajes", "columns": [{ "key": "i", "label": "#", "get": "row.i" }] },

      "hooks": {
        "onStart":     "...",
        "onStep":      "...",
        "onCaseStart": "...",
        "onCaseEnd":   "...",
        "onEnd":       "return { verdict: { pass: ... }, metrics: { extra: 1 } };",
        "onRegister":  "...",
        "onEmit":      "..."
      },

      "verdict": {
        "pass": "ctx.metrics.title_changes > 0",
        "summary": "ctx._trace.titleHistory.length + ' cambios'"
      }
    }
  ]
}
```

## Step kinds

| kind       | Campos clave                                                    | Comportamiento                                    |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------- |
| `stream`   | `prompt`, `streamPath`, `responsePath`, `extract`, `apiRef`     | POST SSE. Parsea eventos `begin` / `message` / `end`. `extract` mapea campos del end → `ctx.vars`. |
| `http`     | `method`, `path`, `body`, `headers`, `expect`, `extract`, `apiRef`, `retry` | HTTP genérico. `expect`: `{status, fieldEquals, matches}`. `extract` mapea paths JSON → `ctx.vars`. |
| `raw`      | igual que `http`                                                | HTTP sin abstracciones.                            |
| `script`   | `run`, `timeoutMs`                                             | JS libre. Acceso a `ctx`. Use `ctx.helpers.register(as, row)` o `ctx.helpers.emit(event, payload)`. |

Todos comparten `description?`, `assert?` (js expr con `(ctx) → boolean`),
`skipIf?`, `onlyIf?`, `record?`, `timeoutMs?`.

## Ctx (contexto del runner)

```ts
type Ctx = {
    apiBase: string;
    apis: Record<string, string>;    // <apiRef> → base
    jwt: Record<string, string>;     // <apiRef> → bearer
    case?: Case;                     // caso activo (si test.cases[])
    vars: Record<string, any>;        // outputs de setup.fetch y extract → {{interpolación}}
    trace: any;
    _trace: any;
    steps: StepResult[];
    rows: Record<string, any>[];     // poblado por helpers.register o step.record
    toolsData: Record<string, any>;
    metrics: Record<string, number | string>;

    helpers: {
        register(as: string, row: Record<string, any>): void;  // empuja fila + dispara onRegister
        emit(event: string, payload?: any): void;             // dispara onEmit
    };
};
```

Interpolación: `{{nombre}}` resuelve primero vía `ctx.case` (params), luego `ctx.vars`. Soporta paths `a.b.c` o `a[0].b`.

## Multi-server & JWT

`requires.apis.<name>`:
```jsonc
"apis": {
  "main":  { "base": "https://api.example.com",  "auth": ["/v1/users"], "jwtRef": "login" },
  "other": { "base": "https://other.example.com", "auth": ["/v1/admin"], "jwtRef": "override" }
}
```

- `jwtRef: "login"` (default): JWT del login del visor.
- `jwtRef: "override"`: el runner acepta override por step en runtime (planificado, todavía sin UI).

Un step apunta al server: `"apiRef": "other"`.

```js
opts = {
  apiBase: "https://...",                // back-compat: default
  apis: { default: "https://...", other: "https://other..." },
  jwt:  { default: "...", other: "..." } // opcional, falla con 401 si falta
}
```

## Casos parametrizados (`cases[]`)

Si `test.cases` está, el runner instancia el test N veces:

- `casesMode: "each"` (def): un run por case.
- `casesMode: "single"`: como tener uno.
- `casesMode: "matrix"`: futuro (cruz `cases[]` × scenarios).

`ctx.case` está disponible dentro de steps/hooks/templates. `ctx.casesSummary` se popula con `{case, verdict}` por iteración.

## Hooks

| Hook          | Args                | Cuándo corre                            | Puede mutar                 |
| ------------- | ------------------- | --------------------------------------- | --------------------------- |
| `onStart`     | `(ctx)`             | 1× antes de cualquier step              | `ctx._trace`, `ctx.vars`     |
| `onStep`      | `(ctx, stepResult)` | tras cada step (incluye errores)        | `ctx.toolsData`, `ctx.rows` vía `register()` |
| `onCaseStart` | `(ctx, case)`       | al inicio de cada case (casos[])        | reset                       |
| `onCaseEnd`   | `(ctx, case)`       | al final de cada case                   | resumen por case             |
| `onEnd`       | `(ctx)`             | 1× tras último step                     | retornar `{verdict?, metrics?}` para override |
| `onRegister`  | `(ctx, row, as)`    | tras `ctx.register()` o `step.record`   | enriquecer filas             |
| `onEmit`      | `(ctx, event, payload)` | tras `ctx.emit()`                  | tools/timeline              |

## Métricas, tools, tabla

`metrics[]` — se renderizan como cards en el visor:
- `key`, `label`, `compute` (js expr), `showWhen?`, `format` (`number|percent|duration|count|ratio`), `order?`.

`tools[]` — visualizaciones declaradas (`timeline`, `histogram`, `sparkline`).

`table` — tabla de resultados:
- `columns[]`: `{key, label, get}` con js expr sobre `row`.

## Métricas son los valores que la UI muestra como "información relevante"

`register()` y `emit()` — para filas y eventos (per-Step):
- `ctx.helpers.register("results", {ok, latency, ...})` → empuja a `ctx.rows` + dispara `onRegister(row, as)`.
- `ctx.helpers.emit("turn.completed", {...})` → dispara `onEmit(event, payload)` (útil para timeline).

## Verdict

Precedencia (1ª gana):
1. `test.hooks.onEnd` que retorne `{verdict: {...}}`.
2. Último step `kind: "script"` que retorne `{verdict: {...}}`.
3. `test.verdict.pass` (js expr sobre ctx).
4. Default FAIL con razón "no verdict".

`verdict.summary` permite pasar una string explicativa.

## Uso programático

```js
import { runTest, formatVerdict, normalizeMetrics, normalizeTools, normalizeTable } from "./src/lib/test-runner/index.mjs";

const payload = await fetch(`${apiBase}/system/testing.json`).then((r) => r.json());
const test = payload.tests.find((t) => t.id === "instrucciones-vs-modelo-exhaustivo");

const verdict = await runTest(test, {
    apiBase: "http://localhost:8802/api",
    apis: { default: "http://localhost:8802/api" },
    jwt: { default: process.env.JWT },     // opcional
    stepDelayMs: 2000,
    onStep: (s, ctx, caseRef) => console.log(s.kind, s.description, caseRef?.id),
});

console.log(formatVerdict(verdict, { verbose: true, color: true }));
console.log("cases:", verdict.cases);
console.log("rows:", verdict.ctx.rows);
process.exit(verdict.pass ? 0 : 1);
```

## CLI

```bash
# Sin JWT — solo endpoints públicos
node src/lib/test-runner/run-against.mjs http://localhost:8802/api instrucciones-vs-modelo

# Con JWT del login (lee dev-token.json desde PatyIA/ISS-AyudasCPIA)
node src/lib/test-runner/run-against.mjs http://localhost:8802/api title-change "eyJ..."

# Con JWT override explícito por apiRef "default"
node src/lib/test-runner/run-against.mjs http://localhost:8802/api my-test --jwt-override="eyJ..."
```

Default `testId` = primero disponible (alfabético). Si no se da `--jwt-override`, JWT se lee de `dev-token.json`.

Exit 0 si PASS, 1 si FAIL.

## Smoke tests

```bash
node src/lib/test-runner/smoke-runner.mjs        # SSE parser + state machine
node src/lib/test-runner/smoke-exact-backend.mjs  # Exact backend format + iconv reuso
```

Ambos tests usan fetch mockeado; **no tocan staging**.

## Backward-compat

- `step.kind: "conv"` se acepta como alias de `"stream"` por transición.
- `step.expectStatus` (campo plano) y `step.expectField`/`expectMatches` siguen funcionando.
- `runner.opts.apiBase` y `runner.opts.jwt` (string único) — back-compat con `apis.default`/`jwt.default`.

## UI

El componente React `src/components/testing/TestingAccordion.jsx` se renderiza en la pestaña
secundaria **Testing** del visor (cuando `viewer.nav` incluye un tab con `tags: ["Testing"]`).
de los `OperationTagGroup` en `SwaggerViewer.jsx`. Cada test es un acordeón con
título, subtítulo (# steps), chip PASS/FAIL, botón Ejecutar, log incremental de
steps y alert final con el verdict formateado.