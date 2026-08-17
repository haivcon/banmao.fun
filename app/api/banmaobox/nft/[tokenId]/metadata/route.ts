import { NextResponse } from "next/server";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  http,
} from "viem";
import { xLayer } from "viem/chains";
import { BANMAO_BOX_ABI } from "@/app/defi/box/generated/abis";
import deployment from "@/deployments/banmaobox-xlayer-mainnet.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: xLayer,
  transport: http("https://xlayerrpc.okx.com"),
});
const boxAddress = deployment.contracts.box as `0x${string}`;
const MAX_UINT256 = (1n << 256n) - 1n;
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

function parseTokenId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const tokenId = BigInt(value);
  return tokenId <= MAX_UINT256 ? tokenId : null;
}

function isNonexistentToken(error: unknown) {
  return (
    error instanceof BaseError &&
    Boolean(error.walk((cause) => cause instanceof ContractFunctionRevertedError))
  );
}

async function readTokenUri(tokenId: bigint) {
  return (await client.readContract({
    address: boxAddress,
    abi: BANMAO_BOX_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  } as never)) as string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId: tokenIdParam } = await params;
  const tokenId = parseTokenId(tokenIdParam);
  if (tokenId === null) {
    return NextResponse.json(
      { error: "tokenId must be a uint256 decimal integer" },
      { status: 400 },
    );
  }
  if (!boxAddress) {
    return NextResponse.json(
      { error: "BanmaoBox contract is not configured" },
      { status: 500 },
    );
  }

  try {
    const tokenUri = await readTokenUri(tokenId);
    const prefix = "data:application/json;base64,";
    if (!tokenUri.startsWith(prefix)) {
      throw new Error("BanmaoBox tokenURI is not base64 JSON");
    }

    const metadata: unknown = JSON.parse(
      Buffer.from(tokenUri.slice(prefix.length), "base64").toString("utf8"),
    );
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      Array.isArray(metadata) ||
      typeof (metadata as Record<string, unknown>).image !== "string" ||
      !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(
        (metadata as Record<string, unknown>).image as string,
      )
    ) {
      throw new Error("BanmaoBox metadata image is not base64 SVG");
    }

    return NextResponse.json(metadata, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    const status = isNonexistentToken(error) ? 404 : 502;
    console.error("[BanmaoBox metadata proxy]", error);
    return NextResponse.json(
      { error: status === 404 ? "BanmaoBox token not found" : "Unable to load BanmaoBox metadata" },
      { status },
    );
  }
}
