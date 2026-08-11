import { NextResponse } from "next/server";
import { readCollectionSearch } from "../../../../lib/collection/server/readers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    if (!query.trim()) return NextResponse.json({ results: [], total: 0 });
    const folder = searchParams.get("folder") || "banmao";
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 50);
    return NextResponse.json(await readCollectionSearch({ query, folder, limit }), { headers: { "Cache-Control": "s-maxage=60" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Collection search error:", message);
    return NextResponse.json({ error: message, results: [], total: 0 }, { status: 500 });
  }
}
