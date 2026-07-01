// Script Node.js: actualizar el payload /system/testing.json en ISS
// para que el juez del test title-change use el valor de
// recalcularTituloCadaMensajesUsuario desde BD en lugar de hardcodear
// expected=1.
// Uso: node scripts/update-testing-payload.mjs [apiBase]

const API_BASE = process.argv[2] || "http://localhost:8802/api";

const newRun = `const trace = ctx._trace || {};
const tc = trace.titleChangesSoFar || [];
const total = trace.messages || 0;
const convId = ctx.iconversacion;
const sameConvAllSteps = !!convId && ctx.steps.every(function(s){ return s.kind !== 'conv' || s.iconversacion === convId; });
const interval = Number(ctx.vars.recalcularTituloCadaMensajesUsuario) || 3;
const expected = Math.floor(total / interval);
// Tolerancia +/-1: el primer turno suele pasar titulo provisional -> titulo LLM
// y pueden existir pequeñas variaciones por orden de persistencia.
const minOk = Math.max(0, expected - 1);
const maxOk = expected + 1;
const realChanges = tc.length;
const pass = sameConvAllSteps && total >= 2 && realChanges >= minOk && realChanges <= maxOk;
const timeline = tc.map(function(c){ return { afterMessage: c.afterMessage, from: c.from, to: c.to }; });
const verdict = {
    totalMessages: total,
    titleChanges: realChanges,
    expectedMinChanges: expected,
    expectedMaxChanges: maxOk,
    sameConversationAllSteps: sameConvAllSteps,
    recalcularTituloCadaMensajesUsuario: interval,
    pass: pass,
    changesTimeline: timeline,
    reason: pass
        ? ('OK: misma conversacion (' + convId + ') a lo largo de ' + total + ' mensajes del USR; titulo cambio ' + realChanges + ' vez/veces (esperado ~' + expected + ' +/-1, intervalo=' + interval + ').')
        : ('FAIL: ' + (sameConvAllSteps ? ('cambios=' + realChanges + ' fuera de rango [' + minOk + ', ' + maxOk + '] para ' + total + ' mensajes (intervalo=' + interval + ', esperado ~' + expected + ').') : ('cada mensaje creo una conversacion nueva - el runner debe reusar iconversacion.')) + ' Timeline: ' + JSON.stringify(timeline)),
};
ctx.vars.verdict = verdict;
return { verdict: verdict };`;

(async () => {
    const getUrl = `${API_BASE}/system/testing.json`;
    console.log(`[update-testing] GET ${getUrl}`);
    const r1 = await fetch(getUrl);
    if (!r1.ok) throw new Error(`GET ${getUrl} -> ${r1.status}`);
    const current = await r1.json();
    if (!current.tests?.length) throw new Error("No hay tests");

    const test = current.tests.find((t) => t.id === "title-change");
    if (!test) throw new Error("No se encontró test id=title-change");
    const scriptStep = [...(test.steps || [])].reverse().find((s) => s.kind === "script");
    if (!scriptStep) throw new Error("No se encontró step kind=script");

    scriptStep.run = newRun;
    scriptStep.description = "JUEZ - Verifica cambios de titulo vs intervalo de BD";

    const putUrl = `${API_BASE}/system/testing.json`;
    console.log(`[update-testing] PUT ${putUrl}`);
    const r2 = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
    });
    if (!r2.ok) {
        const t = await r2.text();
        throw new Error(`PUT ${putUrl} -> ${r2.status}: ${t}`);
    }
    const resp = await r2.json();
    console.log("[update-testing] respuesta:", JSON.stringify(resp, null, 2).slice(0, 400));

    console.log("[update-testing] verificando GET...");
    const r3 = await fetch(getUrl);
    const check = await r3.json();
    const checkScript = [...(check.tests[0].steps || [])].reverse().find((s) => s.kind === "script");
    if (checkScript?.run === newRun) {
        console.log("[update-testing] OK - script del juez persistido correctamente.");
    } else {
        console.log("[update-testing] MISMATCH - el script guardado difiere.");
        process.exit(2);
    }
})().catch((e) => {
    console.error("[update-testing] ERROR:", e.message);
    process.exit(1);
});