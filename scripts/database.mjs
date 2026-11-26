import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";
import { postgresConfig } from "./postgres-config.mjs";

loadProjectEnv();

const command = process.argv[2];
if (!["apply", "seed", "reset", "claim-case"].includes(command)) {
  console.error("Usage: node scripts/database.mjs apply|seed|reset [--confirm-demo-reset] or claim-case <case-id> <account-id>");
  process.exit(1);
}
const [caseId, accountId] = process.argv.slice(3);
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
if (command === "claim-case" && (!uuid.test(caseId ?? "") || !uuid.test(accountId ?? ""))) {
  console.error("Pass a specific case UUID and an existing Supabase account UUID.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Configure a dedicated demo database in .env.local.");
  process.exit(1);
}
if (command === "reset" && !process.argv.includes("--confirm-demo-reset")) {
  console.error("Reset refused. Use npm run db:reset for the explicit demo reset.");
  process.exit(1);
}

let client;
try {
  client = new pg.Client(await postgresConfig(process.env));
  await client.connect();
  await client.query("begin");
  // Serialize apply/seed/reset invocations without a separate migration service.
  await client.query("select pg_advisory_xact_lock(731026310)");
  await client.query("set local statement_timeout = '30s'");
  if (command === "apply") {
    await client.query(`create table if not exists public.reloop_schema_migrations (
      name text primary key, sha256 text not null, applied_at timestamptz not null default now()
    )`);
    await client.query("revoke all on public.reloop_schema_migrations from public, anon, authenticated");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      const sql = await readFile(new URL(name, directory), "utf8");
      const digest = createHash("sha256").update(sql).digest("hex");
      const result = await client.query("select sha256 from public.reloop_schema_migrations where name = $1", [name]);
      if (result.rows.length) {
        const lf = sql.replace(/\r\n/g, "\n");
        const lineEndingDigests = [lf, lf.replace(/\n/g, "\r\n")]
          .map((variant) => createHash("sha256").update(variant).digest("hex"));
        if (!lineEndingDigests.includes(result.rows[0].sha256)) throw new Error("An applied migration changed. Add a new migration instead.");
        continue;
      }
      await client.query(sql);
      await client.query("insert into public.reloop_schema_migrations(name, sha256) values ($1, $2)", [name, digest]);
      console.log(`Applied ${name}`);
    }
  } else if (command === "claim-case") {
    const result = await client.query(`update public.cases c set owner_user_id = $2
      where c.id = $1 and c.synthetic and c.owner_user_id is null
        and exists (select 1 from auth.users u where u.id = $2) returning c.id`, [caseId, accountId]);
    if (!result.rowCount) {
      await client.query("rollback");
      console.error("Could not claim this case. Check that it is an unowned synthetic case and the account exists.");
      process.exitCode = 1;
    } else {
      await client.query(`insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
        values ($1, 'support', 'legacy_case_claimed', $1::text, jsonb_build_object('ownerUserId', $2::uuid))`, [caseId, accountId]);
      await client.query("commit");
      console.log("Case assigned to the specified account.");
    }
  } else {
    if (command === "reset") await client.query(await readFile(new URL("../supabase/reset.sql", import.meta.url), "utf8"));
    await client.query(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
  }
  if (command !== "claim-case") {
    await client.query("commit");
    console.log(`Database ${command} completed. Synthetic merchant fixture only.`);
  }
} catch {
  // Provider/driver errors can contain connection URIs or SQL with data; do not print them.
  await client?.query("rollback").catch(() => {});
  console.error(`Database ${command} failed; transaction rolled back. Check connectivity, migration history and Supabase SQL logs. No connection details are printed.`);
  process.exitCode = 1;
} finally {
  await client?.end().catch(() => {});
}
