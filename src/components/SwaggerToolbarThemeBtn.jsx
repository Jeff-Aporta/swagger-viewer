/** Tema al extremo derecho de la barra — AppShell legacy ponía ThemeSwitch antes de toolbarEnd. */
export function SwaggerToolbarThemeBtn({ ns = "ISA" }) {
  const bag = globalThis[ns] || globalThis.ISS || globalThis.ISA;
  const useThemeMode = bag?.Theme?.useThemeMode;
  const ThemeSwitch = globalThis.ISAFront?.UI?.ThemeSwitch;
  if (!useThemeMode || !ThemeSwitch) return null;
  const tm = useThemeMode();
  return (
    <span className="isa-sw-toolbar-theme" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <ThemeSwitch mode={tm.mode} onToggle={tm.toggle} />
    </span>
  );
}
