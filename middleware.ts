import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// Bot Protection & Rate Limiting Middleware for Vercel
// Reduces Edge Requests + Function Invocations from bots/crawlers
// =============================================================================

// Known bot User-Agent patterns to block (only aggressive/unwanted bots)
const BLOCKED_BOTS = [
    'AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'BLEXBot',
    'DataForSeoBot', 'serpstatbot', 'Bytespider', 'PetalBot',
    'YandexBot', 'MegaIndex', 'BaiduSpider', 'sogou',
    'CCBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot',
    'Amazonbot', 'anthropic-ai', 'Applebot-Extended',
];

// Simple in-memory rate limiter (per-IP, resets on cold start)
// On Vercel Serverless, each instance has its own memory — this is a best-effort approach
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_API = 120;    // Max 120 API requests per minute per IP
const RATE_LIMIT_MAX_PAGE = 60;    // Max 60 page requests per minute per IP

// Cleanup old entries periodically (prevent memory leak)
let lastCleanup = Date.now();
function cleanupRateLimits() {
    const now = Date.now();
    if (now - lastCleanup < 30_000) return; // Cleanup every 30s max
    lastCleanup = now;
    for (const [key, value] of rateLimitMap) {
        if (now > value.resetAt) {
            rateLimitMap.delete(key);
        }
    }
}

function checkRateLimit(key: string, maxRequests: number): boolean {
    cleanupRateLimits();
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true; // Allowed
    }

    entry.count++;
    if (entry.count > maxRequests) {
        return false; // Rate limited
    }
    return true; // Allowed
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const userAgent = request.headers.get('user-agent') || '';

    // 1. Block known bad bots
    const isBlockedBot = BLOCKED_BOTS.some(bot =>
        userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    if (isBlockedBot) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    // 2. Rate limiting for API routes
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

    if (pathname.startsWith('/api/')) {
        const rateLimitKey = `api:${ip}`;
        if (!checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_API)) {
            return NextResponse.json(
                { error: 'Too many requests' },
                {
                    status: 429,
                    headers: { 'Retry-After': '60' },
                }
            );
        }
    } else {
        // Page requests
        const rateLimitKey = `page:${ip}`;
        if (!checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_PAGE)) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: { 'Retry-After': '60' },
            });
        }
    }

    // 3. Add security headers
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

// Only run middleware on pages and API routes (skip static files)
export const config = {
    matcher: [
        // Match all API routes
        '/api/:path*',
        // Match all page routes (exclude static files, _next, favicon)
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|woff|woff2|ttf|eot|css|js|map)$).*)',
    ],
};
