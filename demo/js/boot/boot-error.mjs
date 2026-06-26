/** Error de arranque IS-Swagger: conserva shell de carga o AppShell si ya cargó. */

function readAppTitle() {
  return document.getElementById("isa-boot-title")?.textContent?.trim()
    || document.querySelector('meta[name="application-name"]')?.content?.trim()
    || document.title?.split("—")[0]?.trim()
    || "IS-Swagger";
}

function readAppIcon() {
  return document.querySelector('meta[name="app-icon"]')?.content?.trim() || "mdi:file-code-outline";
}

function tryShowAppShellError(message, { headline, ns = "ISS" } = {}) {
  const React = globalThis.React;
  const createRoot = globalThis.ReactDOM?.createRoot;
  const Shell = globalThis.ISAFront?.Layout?.AppShell;
  const MUI = globalThis.MaterialUI;
  if (!React?.createElement || !createRoot || !Shell || !MUI?.Box) return false;

  const { Box, Typography, Alert, Button } = MUI;
  const title = readAppTitle();
  const icon = readAppIcon();
  const root = document.getElementById("root");
  if (!root) return false;

  createRoot(root).render(
    React.createElement(
      Shell,
      {
        ns,
        title,
        icon,
        showTarget: false,
        bodyScroll: true,
        navRows: [{ id: "boot", value: "inicio", onChange: () => {}, tabs: [{ id: "inicio", label: "Inicio", icon: "mdi:home-outline" }] }],
      },
      React.createElement(
        Box,
        {
          className: "isa-sw-boot-error",
          sx: {
            minHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2, sm: 3 },
            boxSizing: "border-box",
          },
        },
        React.createElement(
          Box,
          { sx: { width: "100%", maxWidth: 680, textAlign: "center" } },
          React.createElement(Typography, { variant: "h6", component: "h1", sx: { fontWeight: 700, mb: 1.5 } }, headline || `No se pudo iniciar ${title}`),
          React.createElement(Alert, { severity: "error", sx: { textAlign: "left", mb: 2 } }, message),
          React.createElement(Button, { variant: "outlined", onClick: () => location.reload() }, "Reintentar"),
        ),
      ),
    ),
  );
  return true;
}

function showBootShellError(message, { headline } = {}) {
  const root = document.getElementById("root");
  if (!root) return;

  const boot = root.querySelector(".isa-app-boot");
  if (!boot) {
    root.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "isa-app-boot isa-app-boot--error";
    shell.innerHTML = `<div class="isa-app-boot__mesh" aria-hidden="true"></div>
<div class="isa-app-boot__card" role="alert" aria-live="assertive">
  <div class="isa-app-boot__icon-wrap isa-app-boot__icon-wrap--error">
    <iconify-icon icon="mdi:alert-circle-outline" width="1.85em" height="1.85em"></iconify-icon>
  </div>
  <p class="isa-app-boot__title" id="isa-boot-title">${readAppTitle()}</p>
  <p class="isa-app-boot__headline" id="isa-boot-headline"></p>
  <p class="isa-app-boot__error" id="isa-boot-error"></p>
  <div class="isa-app-boot__actions" id="isa-boot-actions">
    <button type="button" class="isa-app-boot__retry" onclick="location.reload()">Reintentar</button>
  </div>
</div>
<img class="isa-app-boot-watermark" src="https://pub-1c290cc606c8478899f5764899278571.r2.dev/brand/logo-insoft.png" alt="" aria-hidden="true" decoding="async" />`;
    root.appendChild(shell);
  }

  const host = root.querySelector(".isa-app-boot");
  host?.classList.add("isa-app-boot--error");

  const card = host?.querySelector(".isa-app-boot__card");
  card?.setAttribute("role", "alert");
  card?.setAttribute("aria-live", "assertive");
  card?.setAttribute("aria-busy", "false");

  const icon = document.getElementById("isa-boot-icon");
  if (icon) icon.setAttribute("icon", "mdi:alert-circle-outline");
  host?.querySelector(".isa-app-boot__icon-wrap")?.classList.add("isa-app-boot__icon-wrap--error");

  const bar = host?.querySelector(".isa-app-boot__bar");
  if (bar) bar.hidden = true;

  const title = readAppTitle();
  const titleEl = document.getElementById("isa-boot-title");
  if (titleEl) titleEl.textContent = title;

  let headlineEl = document.getElementById("isa-boot-headline");
  const labelEl = document.getElementById("isa-boot-label");
  if (!headlineEl && labelEl) {
    labelEl.id = "isa-boot-headline";
    labelEl.className = "isa-app-boot__headline";
    headlineEl = labelEl;
  }
  if (headlineEl) headlineEl.textContent = headline || `No se pudo iniciar ${title}`;

  let errEl = document.getElementById("isa-boot-error");
  if (!errEl && headlineEl) {
    errEl = document.createElement("p");
    errEl.id = "isa-boot-error";
    errEl.className = "isa-app-boot__error";
    headlineEl.after(errEl);
  }
  if (errEl) errEl.textContent = message;

  if (!document.getElementById("isa-boot-actions")) {
    const actions = document.createElement("div");
    actions.id = "isa-boot-actions";
    actions.className = "isa-app-boot__actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "isa-app-boot__retry";
    btn.textContent = "Reintentar";
    btn.addEventListener("click", () => location.reload());
    actions.appendChild(btn);
    (errEl || headlineEl || card)?.after(actions);
  }
}

/** @param {unknown} err @param {{ headline?: string; ns?: string }} [opts] */
export function showBootError(err, opts = {}) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(err);
  if (tryShowAppShellError(message, opts)) return;
  showBootShellError(message, opts);
}
