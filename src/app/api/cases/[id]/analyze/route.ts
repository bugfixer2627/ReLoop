import { generationRoute } from "@/lib/workflows/http";
import { generateAnalysis } from "@/lib/workflows/generation";
import { saveEvidenceAnalysis } from "@/lib/workflows/evidence";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return generationRoute(request, context, async (db, bundle) => {
    await saveEvidenceAnalysis(db, bundle);
    return generateAnalysis(db, bundle);
  });
}
