/** Puente swagger → ISAFront.Glass (front-shared neon-glass). */
import {
  GlassToolbar,
  GlassTableWrap,
  GlassPageSurface,
  GlassCard,
  GlassSurface,
  glassCardSx,
  glassSurfaceSx,
  glassHeaderSx,
  NEON_COLORS,
} from "../../../../front-shared/cdn/isa/js/ui/kits/neon-glass/index.js";
import { useMuiColorScheme } from "./use-mui-color-scheme.js";

const { useTheme } = MaterialUI;

export {
  GlassToolbar,
  GlassTableWrap,
  GlassPageSurface,
  GlassCard,
  GlassSurface,
  glassCardSx,
  glassSurfaceSx,
  glassHeaderSx,
  NEON_COLORS,
};

/** Colores glass — palette MUI + fallback DOM (toggle toolbar sincronizado). */
export function useGlassColors() {
  const scheme = useMuiColorScheme();
  const themeMode = useTheme()?.palette?.mode;
  const dark = (themeMode || scheme) === "dark";
  return {
    dark,
    pageBg: "transparent",
    cardBg: dark ? "rgba(15, 34, 54, 0.28)" : "rgba(255, 255, 255, 0.82)",
    cardHi: dark ? "rgba(26, 58, 92, 0.38)" : "rgba(255, 255, 255, 0.90)",
    border: dark ? "rgba(30,144,255,0.28)" : "rgba(30,144,255,0.18)",
    text: dark ? "#e8f4ff" : "#0a2540",
    muted: dark ? "#9ec5eb" : "#4a6278",
    preBg: dark ? "rgba(13, 33, 55, 0.45)" : "rgba(232, 238, 245, 0.55)",
    errTint: dark ? "rgba(211,47,47,0.08)" : "rgba(211,47,47,0.06)",
    warnTint: dark ? "rgba(237,108,2,0.08)" : "rgba(237,108,2,0.06)",
  };
}

export const METHOD_ACCENT = {
  get: "#1e90ff",
  post: "#22c55e",
  put: "#f59e0b",
  patch: "#a855f7",
  delete: "#ef4444",
  head: "#94a3b8",
  options: "#94a3b8",
};

export function methodAccent(method) {
  return METHOD_ACCENT[String(method || "").toLowerCase()] || "#1e90ff";
}

export function glassAccordionSx(c, { accent, tone = "default" } = {}) {
  const a = accent || NEON_COLORS.blue;
  const base = glassCardSx(c, { accent: a, tone, hover: true, radius: "0.75rem", neon: true });
  const borderMix = c.dark ? `color-mix(in srgb, ${a} 52%, rgba(99, 102, 241, 0.35))` : `color-mix(in srgb, ${a} 38%, rgba(30, 144, 255, 0.18))`;
  const glow = c.dark
    ? `0 4px 24px rgba(0,0,0,0.28), 0 0 0 1px color-mix(in srgb, ${a} 34%, transparent), 0 0 32px color-mix(in srgb, ${a} 20%, transparent), inset 0 1px 0 rgba(255,255,255,0.05)`
    : `0 6px 28px rgba(15,23,42,0.06), 0 0 0 1px color-mix(in srgb, ${a} 26%, transparent), 0 0 22px color-mix(in srgb, ${a} 12%, transparent)`;
  const expandedGlow = c.dark
    ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px color-mix(in srgb, ${a} 42%, transparent), 0 0 40px color-mix(in srgb, ${a} 26%, transparent), inset 0 1px 0 rgba(255,255,255,0.06)`
    : `0 8px 32px rgba(15,23,42,0.08), 0 0 0 1px color-mix(in srgb, ${a} 32%, transparent), 0 0 28px color-mix(in srgb, ${a} 14%, transparent)`;
  return {
    ...base,
    border: `1px solid ${borderMix}`,
    boxShadow: glow,
    "&.Mui-expanded": { boxShadow: expandedGlow },
    "& .MuiAccordionSummary-root, & .MuiAccordionDetails-root": {
      background: "transparent",
      backgroundColor: "transparent",
    },
  };
}
