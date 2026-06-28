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

/**
 * Parser SSE incremental: a medida que llegan chunks, separa por líneas
 * (saltando separador doble \n\n) y emite eventos JSON completos.
 * Mantiene un `buffer` interno; usarlo así:
 *   const p = createSseIncrementalParser();
 *   p.feed(chunk);            // → nuevos eventos desde el último feed
 *   p.feed(chunk); p.flush(); // al cerrar el stream
 */
export function createSseIncrementalParser() {
  let buffer = "";
  let pendingTail = "";
  return {
    /** Llamar con cada chunk nuevo de texto. Devuelve eventos completos JSON. */
    feed(chunk) {
      buffer += chunk;
      const events = [];
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of block.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            events.push(JSON.parse(payload));
          } catch {
            /* línea no JSON; seguir */
          }
        }
      }
      return events;
    },
    /** Llamar al cerrar el stream: procesa líneas finales sin \n\n. */
    flush() {
      if (!buffer) return [];
      const tail = buffer.trim();
      buffer = "";
      if (!tail.startsWith("data:")) return [];
      const payload = tail.slice(5).trim();
      if (!payload) return [];
      try {
        return [JSON.parse(payload)];
      } catch {
        return [];
      }
    },
  };
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
