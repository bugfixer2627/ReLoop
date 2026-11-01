import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Use Next's own loader: the same precedence and $ expansion as next dev/build.
// Resolve its bundled @next/env through Next so no hoisting assumption is needed.
const requireNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const { loadEnvConfig } = requireNext("@next/env");
export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export function loadProjectEnv() {
  return loadEnvConfig(projectRoot, process.env.NODE_ENV !== "production", { info() {}, error() {} });
}
