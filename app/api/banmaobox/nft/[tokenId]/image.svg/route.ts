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
    const svg = (await client.readContract({
      address: boxAddress,
      abi: BANMAO_BOX_ABI,
      functionName: "renderSVG",
      args: [tokenId],
    } as never)) as string;

    return new Response(svg, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Type": "image/svg+xml; charset=utf-8",
      },
    });
  } catch (error) {
    const status = isNonexistentToken(error) ? 404 : 502;
    console.error("[BanmaoBox image proxy]", error);
    return NextResponse.json(
      { error: status === 404 ? "BanmaoBox token not found" : "Unable to load BanmaoBox image" },
      { status },
    );
  }
}
