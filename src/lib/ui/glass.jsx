/** Puente swagger → ISAFront.Glass (front-shared neon-glass). */
import {
  GlassToolbar,
  GlassTableWrap,
  GlassPageSurface,
  GlassCard,
  GlassSurface,
  useGlassColors,
  glassCardSx,
  glassSurfaceSx,
  glassHeaderSx,
  NEON_COLORS,
} from "../../../../front-shared/cdn/isa/js/ui/kits/neon-glass/index.js";

export {
  GlassToolbar,
  GlassTableWrap,
  GlassPageSurface,
  GlassCard,
  GlassSurface,
  useGlassColors,
  glassCardSx,
  glassSurfaceSx,
  glassHeaderSx,
  NEON_COLORS,
};

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
  return glassCardSx(c, { accent, tone, hover: true, radius: "0.75rem" });
}
