import { NextResponse } from "next/server";
import { readCollectionPrompts } from "../../../../lib/collection/server/readers";

const CACHE_HEADERS = { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" };
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const folder = new URL(request.url).searchParams.get("folder");
    if (!folder) return NextResponse.json({ error: "Missing folder parameter" }, { status: 400 });
    return NextResponse.json(await readCollectionPrompts({ folder, limit: 20 }), { headers: CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Prompts API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
