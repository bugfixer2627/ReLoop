import { generationRoute } from "@/lib/workflows/http";
import { generateRepair } from "@/lib/workflows/generation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return generationRoute(request, context, generateRepair);
}
