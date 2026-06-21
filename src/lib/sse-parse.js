/** Parsea respuestas text/event-stream del runner de tests (líneas `data: {...}`). */

export function parseSseDataLines(text) {
  const events = [];
  if (!text) return events;
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload) continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      /* línea no JSON */
    }
  }
  return events;
}

export function formatUnitTestSse(events) {
  if (!events.length) return { markdown: "", ok: null, raw: "" };
  const parts = events.map((ev) => ev?.md).filter(Boolean);
  const summary = events.find((ev) => ev?.type === "summary");
  return {
    markdown: parts.join("\n\n---\n\n"),
    ok: summary?.ok ?? null,
    raw: events.map((ev) => `data: ${JSON.stringify(ev)}`).join("\n\n"),
  };
}

export function isEventStreamResponse(res, text) {
  const ct = res?.headers?.get?.("content-type") || "";
  if (/text\/event-stream/i.test(ct)) return true;
  return typeof text === "string" && /^\s*data:\s*\{/m.test(text);
}
