/** Tema al extremo derecho de la barra — AppShell legacy ponía ThemeSwitch antes de toolbarEnd. */
function resolveBag(ns) {
  return globalThis[ns] || globalThis.ISS || globalThis.ISA;
}

function SwaggerToolbarThemeBtnInner({ bag }) {
  const { mode, toggle } = bag.Theme.useThemeMode();
  const ThemeSwitch = bag.UI.ThemeSwitch;
  return (
    <span className="isa-sw-toolbar-theme" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <ThemeSwitch mode={mode} onToggle={toggle} />
    </span>
  );
}

export function SwaggerToolbarThemeBtn({ ns = "ISA" }) {
  const bag = resolveBag(ns);
  if (!bag?.Theme?.useThemeMode || !bag?.UI?.ThemeSwitch) return null;
  return <SwaggerToolbarThemeBtnInner bag={bag} />;
}
