import { spawn } from "node:child_process";
import { loadProjectEnv, projectRoot } from "./load-env.mjs";
import { generationConfig } from "../src/lib/ai/config.mjs";

// Explicit, opt-in provider calls. Only a temporary embedded SQL database is written.
// Load .env.local before Vitest sets NODE_ENV=test. No credentials in argv/output.
loadProjectEnv();
if (!generationConfig(process.env)) {
  console.error("Configure the generation provider locally before running live AI tests.");
  process.exitCode = 1;
} else {
  const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/live-ai.test.ts", "--reporter=verbose"], {
    cwd: projectRoot, stdio: "inherit", windowsHide: true,
    env: { ...process.env, RELOOP_LIVE_PROVIDER_TESTS: "1" },
  });
  child.on("error", () => { console.error("Could not launch live verification."); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
