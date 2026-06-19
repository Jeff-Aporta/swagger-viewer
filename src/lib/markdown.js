/** Markdown + HTML embebido para x-iss-doc-md (marked global si está disponible). */

export function renderMarkdown(md) {
  if (!md) return "";
  try {
    if (typeof marked !== "undefined" && marked.parse) {
      return marked.parse(String(md), { gfm: true, breaks: false });
    }
  } catch {
    /* fallback */
  }
  return (
    '<pre class="isa-sw-doc-fallback">' +
    String(md).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
    "</pre>"
  );
}
