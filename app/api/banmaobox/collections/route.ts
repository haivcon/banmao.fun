import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { isCollectionExplorerChain, listBanmaoBoxCollections } from "@/lib/banmaobox/collectionExplorerServer";
import type { CollectionSort } from "@/app/defi/box/explorer/types";

export const dynamic = "force-dynamic";
const sorts = new Set<CollectionSort>(["newest", "oldest", "supply", "locked"]);
const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const chainId = Number(params.get("chainId") || 196);
  if (!isCollectionExplorerChain(chainId)) return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") || "12", 10) || 12));
  const search = (params.get("search") || "").trim().slice(0, 120);
  const candidate = params.get("sort") as CollectionSort | null;
  const sort: CollectionSort = candidate && sorts.has(candidate) ? candidate : "newest";
  const refresh = params.get("refresh") === "true";
  const prioritizeTokenParam = params.get("prioritizeToken");
  const prioritizeToken = prioritizeTokenParam && isAddress(prioritizeTokenParam) ? getAddress(prioritizeTokenParam) : undefined;
  try {
    return NextResponse.json(await listBanmaoBoxCollections({ chainId, page, pageSize, search, sort, refresh, prioritizeToken }), { headers });
  } catch (error) {
    console.error("BanmaoBox collection index unavailable", error);
    return NextResponse.json({ error: "Collection index is temporarily unavailable" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
