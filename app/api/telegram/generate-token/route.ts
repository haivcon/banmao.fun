import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API_BASE_URL =
  process.env.TELEGRAM_API_BASE_URL ?? "http://103.75.183.59:3000";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const upstreamResponse = await fetch(
      `${TELEGRAM_API_BASE_URL}/api/generate-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body ?? {}),
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
    console.error("Failed to proxy Telegram token request", error);
    return NextResponse.json(
      { message: "Failed to contact Telegram service" },
      { status: 502 }
    );
  }
}