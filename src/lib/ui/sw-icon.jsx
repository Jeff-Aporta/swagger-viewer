const { createElement } = React;

export function bagUi(ns = "ISA") {
  return globalThis[ns]?.UI || null;
}

/** Iconify vía bag ISA o `<iconify-icon>` directo — siempre visible. */
export function SwIcon({ icon, size = 18, style, ns = "ISA" }) {
  const BagIcon = bagUi(ns)?.Icon;
  if (BagIcon) {
    return createElement(BagIcon, { icon, size, style });
  }
  return createElement("iconify-icon", {
    icon,
    style: {
      fontSize: size,
      display: "inline-flex",
      alignItems: "center",
      verticalAlign: "middle",
      ...style,
    },
  });
}

export function tabLabel(icon, label, ns = "ISA") {
  return createElement(
    "span",
    { style: { display: "inline-flex", alignItems: "center", gap: 8 } },
    createElement(SwIcon, { icon, size: 16, ns }),
    createElement("span", null, label),
  );
}
