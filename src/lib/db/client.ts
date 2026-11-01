import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeSupabaseUrl } from "./config.mjs";

const databaseEnvironmentSchema = z.object({
  SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function getDatabaseClient() {
  const config = databaseEnvironmentSchema.safeParse({
    SUPABASE_URL: normalizeSupabaseUrl(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!config.success) return null;

  return createClient(config.data.SUPABASE_URL, config.data.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
    },
  });
}
