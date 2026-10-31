import { readFile, writeFile } from "node:fs/promises";
import { generateSeed } from "./seed-data.mjs";

const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
await writeFile(new URL("../supabase/seed.sql", import.meta.url), generateSeed(fixture));
console.log("Generated supabase/seed.sql from the synthetic input fixture.");
