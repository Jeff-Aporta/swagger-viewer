/**
 * Recolecta los nombres de campos marcados con `x-iss-elevated-only: true`
 * dentro de un body JSON Schema (recorre `properties` y los `items` de `array`).
 *
 * Esto se usa para que el visor advierta al usuario que ciertos campos (p. ej.
 * `modelo`, `temperatura`, `top_p` en POST /conversacion) son reservados a
 * ISS-devs / dev_lead: el backend los descarta silenciosamente para perfiles
 * no elevados y aplica valores operacionales desde `jconfig`.
 */

const ISS_ELEVATED_ONLY_EXTENSION = "x-iss-elevated-only";

function pushFromObject(obj, path, out) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach((v, i) => pushFromObject(v, `${path}[${i}]`, out)); return; }
    if (obj[ISS_ELEVATED_ONLY_EXTENSION] === true) out.push(path);
    const props = obj.properties;
    if (props && typeof props === "object") {
        for (const [k, v] of Object.entries(props)) pushFromObject(v, path ? `${path}.${k}` : k, out);
    }
    const items = obj.items;
    if (items) pushFromObject(items, path ? `${path}[]` : path, out);
}

/** Devuelve la lista de paths de campos `x-iss-elevated-only: true` en el body schema. */
export function collectElevatedOnlyFields(schema) {
    const out = [];
    pushFromObject(schema, "", out);
    // Quita paths vacíos cuando la marca vive en la raíz del schema (no suele pasar,
    // pero si pasara lo exponemos como "body").
    if (out.length === 1 && out[0] === "") return ["body"];
    return out.filter(Boolean);
}
