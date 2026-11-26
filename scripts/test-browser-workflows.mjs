import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { loadProjectEnv, projectRoot } from "./load-env.mjs";
import { generationConfig } from "../src/lib/ai/config.mjs";

// The fixture mode uses a loopback AI response server. Live mode uses the configured AI provider.
const fixture = process.argv.includes("--fixture");
if (!fixture) loadProjectEnv();
await access(new URL("../.next/BUILD_ID", import.meta.url));
if (!fixture && !generationConfig(process.env)) throw new Error("Configure the real generation provider locally first.");
const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/browser-workflows.live.test.ts", "--reporter=verbose"], {
  cwd: projectRoot, stdio: "inherit", windowsHide: true,
  env: { ...process.env, RELOOP_BROWSER_WORKFLOWS: fixture ? "fixture" : "1" },
});
child.on("error", () => { console.error("Could not launch browser verification."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
