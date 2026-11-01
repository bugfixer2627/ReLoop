import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

try {
  const local = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  for (const [name, value] of Object.entries(local)) process.env[name] ??= value;
} catch (error) {
  if (error.code !== "ENOENT") throw new Error("Unable to read .env.local.");
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local.");
  process.exit(1);
}

const email = `reloop-demo-${randomUUID().slice(0, 12)}@example.com`;
const password = randomBytes(32).toString("base64url");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) {
  console.error("Supabase could not create the demo Auth user. Check that Auth is enabled and the service role key is current.");
  process.exit(1);
}

console.log(JSON.stringify({ email, password, userId: data.user.id }, null, 2));
