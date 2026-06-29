/**
 * Procesa azúcares `{{detail:label|content}}` presentes en HTML renderizado
 * desde markdown de un SSE test, y los reemplaza por `<button>` que abrirán
 * un modal con el contenido (típicamente JSON completo de respuesta).
 *
 * Sintaxis admitida:
 *   {{detail:label}}                          →  busca en `details` por label
 *   {{detail:label|contenido libre}}           →  inline (contenido hasta `}}`)
 *   {{detail|contenido libre}}                 →  label generado auto (`Detalle N`)
 *
 * Devuelve el HTML mutado + un array `details` con todos los payloads registrados
 * para que el contenedor los conecte con el modal.
 */

const PLACEHOLDER_RE = /\{\{detail(?::([^\}|]*))?(?:\|((?:[^\}]|\}(?!\}))*))?\}\}/g;

/**
 * @param {string} html - HTML ya procesado por marked/ISAFront.mdToHtml.
 * @returns {{ html: string, details: Array<{ id: string, label: string, content: string, source: 'inline' | 'labeled' }> }}
 */
export function processDetailSugars(html) {
    const src = String(html || "");
    if (!src) return { html: "", details: [] };
    const details = [];
    const next = src.replace(PLACEHOLDER_RE, (full, rawLabel, rawContent) => {
        let label = (rawLabel || "").trim();
        let content = (rawContent == null ? "" : String(rawContent)).trim();
        if (!label && !content) return full;
        if (!content && label) {
            return full; // placeholder con sólo label — lo resuelve el caller con map externo
        }
        if (!label) label = `Detalle ${details.length + 1}`;
        const id = `isdetail_${Math.random().toString(36).slice(2, 10)}_${details.length}`;
        details.push({ id, label, content, source: "inline" });
        const safeLabel = String(label).replace(/[<>&"]/g, (c) =>
            ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]),
        );
        return `<button type="button" class="isa-sw-detail-btn" data-isa-detail-id="${id}" aria-label="Ver detalle: ${safeLabel}">${safeLabel}</button>`;
    });
    return { html: next, details };
}

/**
 * Asocia placeholders `{{detail:label}}` (sin contenido inline) consultando
 * un mapa label→content externo (útil cuando el backend envía un `details` array).
 *
 * Si el label existe en `byLabel`, se reemplaza por un botón apuntando al contenido.
 * Si no, se conserva como fallback (texto plano).
 */
export function resolveLabeledDetails(html, byLabel) {
    const src = String(html || "");
    if (!src || !byLabel) return { html: src, details: [] };
    const details = [];
    const next = src.replace(PLACEHOLDER_RE, (full, rawLabel, rawContent) => {
        const label = (rawLabel || "").trim();
        if (rawContent != null) return full; // ya era inline
        const found = label ? byLabel.get(label) : null;
        if (!found) return label
            ? `<span class="isa-sw-detail-missing">${label}</span>`
            : full;
        const id = `isdetail_lbl_${Math.random().toString(36).slice(2, 10)}_${details.length}`;
        details.push({ id, label, content: found, source: "labeled" });
        const safeLabel = String(label).replace(/[<>&"]/g, (c) =>
            ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]),
        );
        return `<button type="button" class="isa-sw-detail-btn" data-isa-detail-id="${id}" aria-label="Ver detalle: ${safeLabel}">${safeLabel}</button>`;
    });
    return { html: next, details };
}

/** Serializa el contenido (string u objeto) en JSON pretty para mostrarlo en el modal. */
export function detailToJsonText(content) {
    if (content == null) return "";
    if (typeof content === "string") {
        const trimmed = content.trim();
        // Si ya parece JSON, lo pretty-printeamos; si no, lo dejamos tal cual.
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("`")) {
            try {
                const obj = JSON.parse(trimmed.startsWith("`") ? trimmed.slice(1, -1) : trimmed);
                return JSON.stringify(obj, null, 2);
            } catch {
                return content;
            }
        }
        return content;
    }
    try {
        return JSON.stringify(content, null, 2);
    } catch {
        return String(content);
    }
}
