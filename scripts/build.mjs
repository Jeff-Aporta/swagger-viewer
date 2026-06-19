/**
 * Build swagger-viewer — boot + app bundle (nombres fijos, sin chunks hash).
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const esbuild = require("../../../apps/src/scripts/node_modules/esbuild");

const CDN_DIR = join(root, "cdn");
const BOOT_JS = join(CDN_DIR, "swagger-viewer.min.js");
const APP_JS = join(CDN_DIR, "swagger-viewer-app.min.js");
const CDN_CSS = join(CDN_DIR, "swagger-viewer.min.css");
const CSS_PAGE = join(root, "..", "neon-glass", "css", "neon-glass-page.css");
const CSS_IN = join(root, "css", "swagger-viewer.css");

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .trim();
}

function build() {
  mkdirSync(CDN_DIR, { recursive: true });

  esbuild.buildSync({
    entryPoints: [join(root, "src", "viewer-chunk.jsx")],
    outfile: APP_JS,
    bundle: true,
    minify: true,
    legalComments: "none",
    target: "es2022",
    format: "esm",
    loader: { ".jsx": "jsx" },
    banner: {
      js: `const React=globalThis.React;const ReactDOM=globalThis.ReactDOM;const MaterialUI=globalThis.MaterialUI;`,
    },
  });

  esbuild.buildSync({
    entryPoints: [join(root, "src", "index.jsx")],
    outfile: BOOT_JS,
    bundle: true,
    minify: true,
    legalComments: "none",
    target: "es2022",
    format: "esm",
  });

  writeFileSync(CDN_CSS, minifyCss(readFileSync(CSS_PAGE, "utf8") + readFileSync(CSS_IN, "utf8")), "utf8");

  for (const name of readdirSync(CDN_DIR)) {
    if (/^swagger-viewer-[A-Z0-9]+\.js$/i.test(name)) {
      unlinkSync(join(CDN_DIR, name));
    }
  }

  console.log("swagger-viewer build OK");
  console.log("  ", BOOT_JS);
  console.log("  ", APP_JS);
  console.log("  ", CDN_CSS);
}

build();
