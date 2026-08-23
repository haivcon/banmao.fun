import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getBanmaoBoxCollection, isCollectionExplorerChain } from "@/lib/banmaobox/collectionExplorerServer";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  const chainId = Number(new URL(request.url).searchParams.get("chainId") || 196);
  if (!isCollectionExplorerChain(chainId) || !isAddress(address)) return NextResponse.json({ error: "Invalid chain or collection address" }, { status: 400 });
  try {
    const result = await getBanmaoBoxCollection(chainId, getAddress(address));
    return result ? NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }) : NextResponse.json({ error: "Collection not found in the Factory registry" }, { status: 404 });
  } catch (error) {
    console.error("BanmaoBox collection detail unavailable", error);
    return NextResponse.json({ error: "Collection detail is temporarily unavailable" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
