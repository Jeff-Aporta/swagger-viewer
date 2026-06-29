/** Formato humano de bytes (B / KB / MB / GB) con 1 decimal. */

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes, { precision = 1 } = {}) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1) return `${n} B`;
  if (n < 1024) return `${Math.round(n)} B`;
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const fixed = value.toFixed(value >= 100 || unit === 0 ? 0 : precision).replace(/\.0+$/, "");
  return `${fixed} ${UNITS[unit]}`;
}
