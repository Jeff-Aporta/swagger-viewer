/**
 * Build @jeff-aporta/is-swagger — CDN viewer + npm server/embed (CJS + ESM).
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

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
const CSS_DEMO = join(root, "demo", "css", "demo.css");

const SERVER_ENTRIES = [
    "server/envelope.ts",
    "server/spec.ts",
    "server/docs.ts",
    "server/postman.ts",
    "server/viewer-pins.ts",
    "server/build-spec.ts",
    "server/index.ts",
];

const EMBED_JS = [
    { from: "src/embed/build-html.js", outDir: "embed", name: "build-html" },
    { from: "src/lib/is-document.js", outDir: "lib", name: "is-document" },
];

function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,>+~])\s*/g, "$1")
        .trim();
}

function buildCdn() {
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

    writeFileSync(
        CDN_CSS,
        minifyCss(readFileSync(CSS_PAGE, "utf8") + readFileSync(CSS_IN, "utf8") + readFileSync(CSS_DEMO, "utf8")),
        "utf8",
    );

    for (const name of readdirSync(CDN_DIR)) {
        if (/^swagger-viewer-[A-Z0-9]+\.js$/i.test(name)) {
            unlinkSync(join(CDN_DIR, name));
        }
    }
}

function buildServerEntry(rel) {
    const entry = join(root, rel);
    const name = basename(rel, ".ts");
    const outDir = join(root, "dist", "server");
    mkdirSync(outDir, { recursive: true });

    for (const format of ["esm", "cjs"]) {
        esbuild.buildSync({
            entryPoints: [entry],
            outfile: join(outDir, `${name}.${format === "esm" ? "js" : "cjs"}`),
            bundle: true,
            platform: "node",
            format,
            target: "node18",
        });
    }
}

function buildEmbedJs() {
    for (const { from, outDir, name } of EMBED_JS) {
        const entry = join(root, from);
        const destDir = join(root, "dist", outDir);
        mkdirSync(destDir, { recursive: true });
        copyFileSync(entry, join(destDir, `${name}.js`));
        esbuild.buildSync({
            entryPoints: [entry],
            outfile: join(destDir, `${name}.cjs`),
            bundle: true,
            platform: "node",
            format: "cjs",
            target: "node18",
        });
    }
}

function writeEmbedTypes() {
    writeFileSync(
        join(root, "dist", "embed", "build-html.d.ts"),
        `export function buildSwaggerViewerHtml(opts: Record<string, unknown>): string;
export function buildSwaggerUiHtml(openApiJsonUrl: string, opts?: Record<string, unknown>): string;
`,
        "utf8",
    );
    writeFileSync(
        join(root, "dist", "lib", "is-document.d.ts"),
        `export const IS_DOCUMENT_KIND: string;
export const IS_DOCUMENT_VERSION: number;
export function viewerConfigFromBoot(config?: Record<string, unknown>): Record<string, unknown>;
export function buildIsDocument(config: Record<string, unknown>, spec: Record<string, unknown>): Record<string, unknown>;
export function parseIsDocument(doc: unknown): { config: Record<string, unknown>; spec: Record<string, unknown> } | null;
export function isDocumentText(doc: Record<string, unknown>): string;
`,
        "utf8",
    );
}

function build() {
    buildCdn();
    buildEmbedJs();
    writeEmbedTypes();
    for (const rel of SERVER_ENTRIES) buildServerEntry(rel);
    execSync("npx tsc -p tsconfig.build.json", { cwd: root, stdio: "inherit" });
    console.log("@jeff-aporta/is-swagger build OK");
    console.log("  CDN:", BOOT_JS);
    console.log("  npm: dist/server/* dist/embed/* dist/lib/*");
}

build();
