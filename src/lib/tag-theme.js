/** Icono y acento por tag OpenAPI (temática ISA). */

const DEFAULT = { icon: "mdi:api", accent: "100, 116, 139" };

/** Clave normalizada → { icon, accent } (accent = "r, g, b" para CSS). */
const BY_NAME = {
  conversaciones: { icon: "mdi:chat-processing-outline", accent: "30, 144, 255" },
  sistema: { icon: "mdi:heart-pulse", accent: "16, 185, 129" },
  testing: { icon: "mdi:flask-outline", accent: "168, 85, 247" },
  auth: { icon: "mdi:shield-key-outline", accent: "245, 158, 11" },
  autenticacion: { icon: "mdi:shield-key-outline", accent: "245, 158, 11" },
  general: { icon: "mdi:view-grid-outline", accent: "14, 165, 233" },
  tickets: { icon: "mdi:ticket-outline", accent: "6, 182, 212" },
  metricas: { icon: "mdi:chart-timeline-variant", accent: "99, 102, 241" },
  commits: { icon: "mdi:source-commit", accent: "34, 197, 94" },
};

function tagKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function parseAccentRgb(accent) {
  return String(accent || DEFAULT.accent)
    .split(",")
    .map((s) => parseInt(s.trim(), 10));
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
      break;
    case gn:
      h = ((bn - rn) / d + 2) / 6;
      break;
    default:
      h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  if (s === 0) {
    const v = Math.round(ln * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hn = ((h % 360) + 360) % 360 / 360;
  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

/** Acento de subcategoría: mismo tono con matiz ligeramente rotado respecto al tag padre. */
export function deriveSubgroupAccent(accentRgb, hueShift = 22) {
  const [r, g, b] = parseAccentRgb(accentRgb);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h + hueShift, s, l);
  return `${nr}, ${ng}, ${nb}`;
}

/** Resuelve tema visual del tag; admite override OpenAPI `x-isa-icon` / `x-isa-accent`. */
export function resolveTagTheme(name, meta = {}) {
  const base = BY_NAME[tagKey(name)] || DEFAULT;
  const icon = meta["x-isa-icon"] || meta["x-iss-icon"] || meta.icon || base.icon;
  const accent = meta["x-isa-accent"] || meta.accent || base.accent;
  return { icon, accent };
}
