import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REMOVED_GAME_PATHS = [
    "/gamefi/banmaominer",
    "/gamefi/miner",
    "/gamefi/worldcup",
    "/banmaominer",
    "/worldcup",
    "/api/banmaominer",
    "/api/worldcup",
] as const;

function isRemovedGamePath(pathname: string): boolean {
    return REMOVED_GAME_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
}

export function proxy(request: NextRequest) {
    if (!isRemovedGamePath(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    return new NextResponse("Not Found", {
        status: 404,
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
    });
}

export const config = {
    matcher: [
        "/gamefi/banmaominer/:path*",
        "/gamefi/miner/:path*",
        "/gamefi/worldcup/:path*",
        "/banmaominer/:path*",
        "/worldcup/:path*",
        "/api/banmaominer/:path*",
        "/api/worldcup/:path*",
    ],
};