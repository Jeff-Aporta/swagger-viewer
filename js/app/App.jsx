import { SwaggerViewer } from "../../../src/SwaggerViewer.jsx";

const { useState, useEffect } = React;

export function App() {
  const params = new URLSearchParams(location.search);
  const specUrl = params.get("spec");
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    if (specUrl) return;
    const url = new URL("../../openapi/sample.json", import.meta.url).href;
    fetch(url)
      .then((r) => r.json())
      .then(setSpec)
      .catch((e) => console.error(e));
  }, [specUrl]);

  const config = {
    ns: "ISA",
    shell: true,
    brand: {
      title: "Swagger Viewer",
      icon: "mdi:api",
    },
    auth: { enabled: false },
    exports: {
      openApiUrl: specUrl || new URL("../../openapi/sample.json", import.meta.url).href,
      openApiDownloadName: "openapi.json",
    },
    ...(specUrl ? { specUrl } : {}),
  };

  if (!specUrl && !spec) {
    return React.createElement("div", { className: "isa-app-boot" }, "Cargando especificación…");
  }

  return React.createElement(SwaggerViewer, { config, spec: specUrl ? undefined : spec });
}
