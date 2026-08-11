// app/api/hub/quests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, initializeDatabase } from "@/lib/db";
import { readCollectionQuests } from "@/lib/collection/server/readers";

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");
    if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });
    await initializeDatabase();
    const result = await readCollectionQuests(
      { wallet: address },
      { execute: async (query) => {
        const response = await db.execute(query);
        return { rows: response.rows as unknown as Array<Record<string, unknown>> };
      } },
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Quests GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
