import { generationRoute } from "@/lib/workflows/http";
import { generateSupport } from "@/lib/workflows/generation";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return generationRoute(request, context, generateSupport);
}
