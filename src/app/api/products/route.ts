import { createProductRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { registerProduct } from "@/lib/db/catalog";
import { checkAccess, readAuthSession } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export async function POST(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const user = readAuthSession(request);
  if (!user) return apiFailure("UNAUTHORIZED", "Sign in to register a product.", 401);
  const input = createProductRequestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return apiFailure("INVALID_REQUEST", "Check the product name, SKU and version.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    return apiSuccess(await registerProduct(db, user.userId, input.data), 201);
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") return apiFailure("CONFLICT", "This SKU is already registered or reserved for the demo.", 409);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not register the product.", 503, true);
  }
}
