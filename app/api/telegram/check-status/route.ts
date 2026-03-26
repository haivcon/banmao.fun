import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API_BASE_URL =
  process.env.TELEGRAM_API_BASE_URL ?? "http://103.75.183.59:3000";

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { message: "Missing walletAddress parameter" },
      { status: 400 }
    );
  }

  try {
    const upstreamResponse = await fetch(
      `${TELEGRAM_API_BASE_URL}/api/check-status?walletAddress=${encodeURIComponent(walletAddress)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const text = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: upstreamResponse.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    console.error("Failed to proxy Telegram status request", error);
    return NextResponse.json(
      { message: "Failed to contact Telegram service" },
      { status: 502 }
    );
  }
}