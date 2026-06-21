#!/usr/bin/env node
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const require = createRequire(join(root, "..", "..", "src", "scripts", "package.json"));
const { Pool } = require("pg");

const CRED_KEY = "NPM_TOKEN_JEFF_APORTA_WRITE";
const NPMRC = join(root, ".npmrc.publish");

function loadDbUrl() {
    const env = process.env.LANGLAB_DATABASE_URL?.trim();
    if (env) return env;
    const settingsPath = join(root, "..", "..", "local.settings.json");
    if (!existsSync(settingsPath)) throw new Error("Falta LANGLAB_DATABASE_URL o Personal/apps/local.settings.json");
    return JSON.parse(readFileSync(settingsPath, "utf8")).Values.LANGLAB_DATABASE_URL;
}

async function fetchToken() {
    const env = process.env[CRED_KEY]?.trim();
    if (env) return env;
    const pool = new Pool({ connectionString: loadDbUrl(), ssl: { rejectUnauthorized: false } });
    try {
        const { rows } = await pool.query(
            `SELECT "VALOR" FROM "BD_LANGLAB"."CREDENCIALES" WHERE "NOMBRE" = $1 LIMIT 1`,
            [CRED_KEY],
        );
        const token = rows[0]?.VALOR?.trim();
        if (!token) throw new Error(`Credencial ${CRED_KEY} no encontrada en BD`);
        return token;
    } finally {
        await pool.end();
    }
}

async function main() {
    const token = await fetchToken();
    writeFileSync(NPMRC, `//registry.npmjs.org/:_authToken=${token}\n`, "utf8");
    try {
        execSync("npm publish --access restricted --userconfig .npmrc.publish", { cwd: root, stdio: "inherit" });
        console.log("@jeff-aporta/is-swagger publicado OK");
    } finally {
        if (existsSync(NPMRC)) unlinkSync(NPMRC);
    }
}

main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
});
