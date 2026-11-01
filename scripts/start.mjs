import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadProjectEnv } from "./load-env.mjs";

process.env.NODE_ENV ??= "production";
loadProjectEnv();

const next = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const proxyEnabled = process.env.NODE_USE_ENV_PROXY === "1" && process.allowedNodeEnvironmentFlags.has("--use-env-proxy");
const args = [...(proxyEnabled ? ["--use-env-proxy"] : []), fileURLToPath(next), "start", ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { env: process.env, stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });
