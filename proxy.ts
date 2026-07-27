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

const DEVELOPMENT_ONLY_PATHS = [
    "/defi/launchpad",
    "/api/launchpad",
] as const;

function matchesPath(pathname: string, paths: readonly string[]): boolean {
    return paths.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
}

function shouldReturnNotFound(pathname: string): boolean {
    if (matchesPath(pathname, REMOVED_GAME_PATHS)) return true;

    return (
        process.env.NODE_ENV !== "development" &&
        matchesPath(pathname, DEVELOPMENT_ONLY_PATHS)
    );
}

export function proxy(request: NextRequest) {
    if (!shouldReturnNotFound(request.nextUrl.pathname)) {
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
        "/defi/launchpad/:path*",
        "/api/launchpad/:path*",
    ],
};