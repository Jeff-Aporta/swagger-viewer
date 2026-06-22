/** Extrae filas de respuesta InSoft / listados para x-iss-lookup. */

export function extractLookupRows(data, lookup) {
  if (!data) return [];
  const body = data.respuesta != null ? data.respuesta : data;
  if (lookup?.itemsPath) {
    return body[lookup.itemsPath] || body.items || body.rows || [];
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(body)) return body;
  return body.conversaciones || body.items || body.rows || [];
}
