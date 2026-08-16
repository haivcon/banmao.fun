import { NextResponse } from "next/server";
import { verifyNewBanmaoBox } from "@/lib/banmaobox/verifyNewCollection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const txHash = (body as { txHash?: unknown } | null)?.txHash;
  if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "txHash must be a 32-byte hex transaction hash" }, { status: 400 });
  }

  try {
    const result = await verifyNewBanmaoBox(txHash as `0x${string}`);
    const pending = result.status === "pending" || result.status === "waiting-for-indexer";
    return NextResponse.json(result, {
      status: pending ? 202 : 200,
      headers: pending ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    const clientError = /receipt|transaction|event|factory|registry|runtime|release|underlying|renderer/i.test(message);
    console.error("[BanmaoBox verifier]", message);
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 502 });
  }
}
