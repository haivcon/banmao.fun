import { NextResponse } from "next/server";
import { loadAIConfig } from "../../../../lib/ai/server/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = loadAIConfig();
    if (!config.flags.chat) return new NextResponse(null, { status: 404 });
    return NextResponse.json(
      {
        models: config.models,
        defaultModel: config.defaultModel,
        capabilities: { txCopilot: config.flags.txCopilot },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
