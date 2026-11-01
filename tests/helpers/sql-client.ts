import { createClient } from "@supabase/supabase-js";
import type { PGlite } from "@electric-sql/pglite";

// TEST TRANSPORT ONLY: real Supabase SDK and repositories, real embedded SQL.
// This narrow PostgREST transport substitute is not a hosted Supabase test.
export function sqlFetch(db: PGlite): typeof fetch {
  const tables = new Set(["products", "cases", "evidence_sources", "platform_listings", "rules", "artifacts", "artifact_versions", "findings", "revision_events", "artifact_reviews", "tasks", "audit_events"]);
  const identifier = (value: string) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error("Invalid SQL test identifier");
    return `"${value}"`;
  };
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const name = parts.at(-1)!;
    try {
      let rows: Record<string, unknown>[];
      if (parts.includes("rpc")) {
        if (!name.startsWith("reloop_")) throw new Error("Unexpected SQL test RPC");
        const args = Object.entries(await request.json());
        rows = (await db.query<Record<string, unknown>>(`select * from ${identifier(name)}(${args.map(([key], index) => `${identifier(key)} => $${index + 1}`).join(",")})`, args.map(([key, value]) => ["p_content", "p_findings", "p_task", "p_version", "p_revision", "p_review"].includes(key) ? JSON.stringify(value) : value))).rows;
      } else {
        if (!tables.has(name)) throw new Error("Unexpected SQL test table");
        if (request.method === "POST") {
          const entries = Object.entries(await request.json());
          rows = (await db.query<Record<string, unknown>>(`insert into ${identifier(name)} (${entries.map(([key]) => identifier(key)).join(",")}) values (${entries.map((_, index) => `$${index + 1}`).join(",")}) returning *`, entries.map(([, value]) => value))).rows;
        } else {
          const filters = [...url.searchParams].filter(([, value]) => value.startsWith("eq."));
          const where = filters.length ? ` where ${filters.map(([key], index) => `${identifier(key)} = $${index + 1}`).join(" and ")}` : "";
          rows = (await db.query<Record<string, unknown>>(`select * from ${identifier(name)}${where}`, filters.map(([, value]) => value.slice(3)))).rows;
          if (name === "cases" && url.searchParams.get("select")?.includes("products!inner")) {
            for (const row of rows) row.products = (await db.query("select sku from products where id = $1", [row.product_id])).rows[0];
          }
        }
      }
      const single = request.headers.get("accept")?.includes("vnd.pgrst.object");
      if (parts.includes("rpc") && rows[0] && Object.keys(rows[0]).length === 1 && name in rows[0]) return Response.json(rows[0][name] ?? null);
      return Response.json(single ? rows[0] ?? null : rows, { status: request.method === "POST" && !parts.includes("rpc") ? 201 : 200 });
    } catch (error) {
      const detail = error as { message: string; code?: string };
      return Response.json({ message: detail.message, code: detail.code ?? "XX000", details: null, hint: null }, { status: 400 });
    }
  };
  return fetcher;
}

export function sqlClient(db: PGlite) {
  return createClient("https://sql-test.invalid", "local-test-only", { global: { fetch: sqlFetch(db) }, auth: { persistSession: false } });
}
