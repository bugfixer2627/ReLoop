import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

// Load only optional proxy settings before starting Node and Next.js.
const env = { ...process.env };
try {
  const local = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "NODE_USE_ENV_PROXY"]) {
    if (env[key] === undefined && local[key]) env[key] = local[key];
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const next = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const child = spawn(process.execPath, [fileURLToPath(next), "dev", ...process.argv.slice(2)], { env, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });
