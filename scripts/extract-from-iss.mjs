#!/usr/bin/env node
/** Extrae script/CSS de swagger-iss-ui.ts (una vez; fuente canónica pasa a components/swagger). */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const issUi = readFileSync(
  "c:/ContaPyme/PatyIA/ISS-AyudasCPIA/src/lib/swagger/swagger-iss-ui.ts",
  "utf8",
);

function extractConst(src, name) {
  const marker = `export const ${name} = \``;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`missing ${name}`);
  let i = start + marker.length;
  let out = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === "`" && src[i - 1] !== "\\") break;
    out += ch;
    i++;
  }
  return out;
}

const script = extractConst(issUi, "SWAGGER_ISS_UI_SCRIPT");
const css = extractConst(issUi, "SWAGGER_ISS_UI_CSS");

writeFileSync(join(root, "src/swagger-extensions.js"), `/** @jeff-aporta/swagger-viewer */\n${script}\n`);
writeFileSync(join(root, "css/swagger-viewer.css"), `${css.trim()}\n`);
console.log("extract-from-iss OK", { script: script.length, css: css.length });
