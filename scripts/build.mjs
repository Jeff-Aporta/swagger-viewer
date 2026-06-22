/**
 * Build IS-Swagger — bundles CDN frontend + vendor Node (cdn/vendor) para hosts.
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const CDN_DIR = join(root, "cdn");
const BOOT_JS = join(CDN_DIR, "swagger-viewer.min.js");
const APP_JS = join(CDN_DIR, "swagger-viewer-app.min.js");
const CDN_CSS = join(CDN_DIR, "swagger-viewer.min.css");
const CSS_KIT = join(root, "..", "front-shared", "cdn", "isa", "css", "kits", "neon-glass", "neon-glass.css");
const CSS_IN = join(root, "css", "swagger-viewer.css");
const CSS_DEMO = join(root, "demo", "css", "demo.css");

function gitShortRef() {
    try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
        const versions = JSON.parse(readFileSync(join(CDN_DIR, "versions.json"), "utf8"));
        return String(versions.componentRef || "main");
    }
}

function syncVersionsAndPins() {
    const ref = gitShortRef();

    const pinsPath = join(root, "server", "viewer-pins.ts");
    let pins = readFileSync(pinsPath, "utf8");
    pins = pins.replace(/SWAGGER_VIEWER_REF = "[^"]+"/, `SWAGGER_VIEWER_REF = "${ref}"`);
    writeFileSync(pinsPath, pins, "utf8");

    const versionsPath = join(CDN_DIR, "versions.json");
    const versions = JSON.parse(readFileSync(versionsPath, "utf8"));
    writeFileSync(
        versionsPath,
        `${JSON.stringify(
            {
                ...versions,
                componentRef: ref,
                jsdelivr: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/swagger-viewer@${ref}/cdn`,
                note: "Runtime: jsDelivr GitHub pin o /api/swagger/cdn del host (vendor, sin npm).",
            },
            null,
            2,
        )}\n`,
        "utf8",
    );
}

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
        minifyCss(readFileSync(CSS_KIT, "utf8") + readFileSync(CSS_IN, "utf8") + readFileSync(CSS_DEMO, "utf8")),
        "utf8",
    );

    for (const name of readdirSync(CDN_DIR)) {
        if (/^swagger-viewer-[A-Z0-9]+\.js$/i.test(name)) {
            unlinkSync(join(CDN_DIR, name));
        }
    }
}

function copyEmbedToCdn() {
    copyFileSync(join(root, "embed", "boot.mjs"), join(CDN_DIR, "embed-boot.mjs"));
    copyFileSync(join(root, "embed", "index.html"), join(CDN_DIR, "embed-index.html"));
}

function buildVendorBundles() {
    const outDir = join(root, "cdn", "vendor");
    mkdirSync(outDir, { recursive: true });
    esbuild.buildSync({
        entryPoints: [join(root, "server", "build-exports.ts")],
        outfile: join(outDir, "iss-exports.cjs"),
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node18",
    });
    esbuild.buildSync({
        entryPoints: [join(root, "src", "embed", "build-html.js")],
        outfile: join(outDir, "build-html.cjs"),
        bundle: true,
        platform: "node",
        format: "cjs",
        target: "node18",
    });
}

function build() {
    syncVersionsAndPins();
    buildCdn();
    copyEmbedToCdn();
    buildVendorBundles();
    console.log("IS-Swagger build OK");
    console.log("  CDN:", BOOT_JS);
    console.log("  vendor:", join(CDN_DIR, "vendor", "iss-exports.cjs"));
}

build();
