import { NextResponse } from "next/server";

/**
 * GET /api/collection/search
 *
 * AI-powered search for collection images using fuzzy keyword matching
 * and Cloudinary tag-based search.
 *
 * Query params:
 *   ?q=cute cat playing    — natural language query
 *   ?folder=banmao         — scope to folder
 *
 * Approach: tokenize query → match against public_id keywords + folder names.
 * Returns scored results sorted by relevance.
 */

function parseCloudinaryUrl() {
    const url = process.env.CLOUDINARY_URL;
    if (!url) throw new Error("CLOUDINARY_URL is not set");
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (!match) throw new Error("Invalid CLOUDINARY_URL format");
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

// Keyword synonyms for AI-like matching
const KEYWORD_MAP: Record<string, string[]> = {
    cat: ["banmao", "mao", "cat", "kitty", "kitten", "neko"],
    defi: ["defi", "swap", "stake", "farm", "yield", "liquidity", "pool"],
    money: ["money", "coin", "token", "crypto", "cash", "rich", "gold"],
    game: ["game", "play", "gaming", "controller", "arcade"],
    space: ["space", "galaxy", "moon", "rocket", "astronaut", "cosmos"],
    food: ["food", "eat", "pizza", "ramen", "sushi", "cook", "chef"],
    music: ["music", "dj", "guitar", "dance", "party", "disco"],
    fight: ["fight", "battle", "warrior", "sword", "boxing", "punch"],
    love: ["love", "heart", "valentine", "romance", "kiss", "cute"],
    sad: ["sad", "cry", "rain", "lonely", "depressed"],
    happy: ["happy", "smile", "laugh", "joy", "celebrate", "party"],
    angry: ["angry", "mad", "rage", "fire", "furious"],
    cool: ["cool", "sunglasses", "chill", "ice", "snow", "winter"],
    hot: ["hot", "fire", "flame", "summer", "beach", "sun"],
    work: ["work", "office", "computer", "laptop", "code", "programming"],
    sport: ["sport", "football", "basketball", "soccer", "tennis", "gym"],
    travel: ["travel", "plane", "airplane", "vacation", "tourist", "map"],
    water: ["water", "sea", "ocean", "swim", "fish", "wave", "surf"],
    night: ["night", "dark", "moon", "star", "sleep", "dream"],
    meme: ["meme", "pepe", "doge", "wojak", "chad", "lol", "bruh"],
};

function tokenize(query: string): string[] {
    return query.toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(t => t.length > 1);
}

function expandKeywords(tokens: string[]): string[] {
    const expanded = new Set(tokens);
    for (const token of tokens) {
        for (const [, synonyms] of Object.entries(KEYWORD_MAP)) {
            if (synonyms.includes(token)) {
                for (const s of synonyms) expanded.add(s);
            }
        }
    }
    return [...expanded];
}

function scoreMatch(publicId: string, folder: string, keywords: string[]): number {
    const id = publicId.toLowerCase();
    const f = folder.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
        if (id.includes(kw)) score += 10;
        if (f.includes(kw)) score += 5;
        // Partial match
        if (id.split(/[_\-\/]/).some(part => part.startsWith(kw))) score += 3;
    }
    return score;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";
        const folder = searchParams.get("folder") || "banmao";

        if (!query.trim()) {
            return NextResponse.json({ results: [], total: 0 });
        }

        const tokens = tokenize(query);
        const keywords = expandKeywords(tokens);

        const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();
        const searchUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
        const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

        // Build Cloudinary search expression using expanded keywords
        const expression = `folder:${folder}* AND (${keywords.slice(0, 5).map(k => `public_id:*${k}*`).join(" OR ")})`;

        const response = await fetch(searchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({
                expression,
                max_results: 100,
                sort_by: [{ public_id: "asc" }],
                with_field: ["tags", "context"],
            }),
        });

        if (!response.ok) {
            // Fallback: fetch all and filter client-side
            const fallbackRes = await fetch(searchUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({
                    expression: `folder:${folder}*`,
                    max_results: 500,
                    sort_by: [{ public_id: "asc" }],
                    with_field: ["tags", "context"],
                }),
            });

            if (!fallbackRes.ok) {
                return NextResponse.json({ results: [], total: 0, error: "Search unavailable" });
            }

            const fallbackData = await fallbackRes.json();
            const scored = (fallbackData.resources || [])
                .map((r: { public_id: string; secure_url: string; folder?: string; format: string; resource_type: string; width: number; height: number; bytes: number; duration?: number; created_at: string; asset_folder?: string; tags?: string[]; context?: Record<string, string>; aspect_ratio?: number }) => ({
                    ...r,
                    folder: r.asset_folder || r.folder || "",
                    tags: r.tags || [],
                    context: r.context || {},
                    aspect_ratio: r.aspect_ratio || (r.width && r.height ? +(r.width / r.height).toFixed(4) : undefined),
                    score: scoreMatch(r.public_id, r.asset_folder || r.folder || "", keywords),
                }))
                .filter((r: { score: number }) => r.score > 0)
                .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
                .slice(0, 50);

            return NextResponse.json({
                results: scored.map((r: { public_id: string; secure_url: string; folder: string; format: string; resource_type: string; width: number; height: number; bytes: number; duration?: number; score: number; tags?: string[]; context?: Record<string, string>; aspect_ratio?: number }) => ({
                    public_id: r.public_id,
                    secure_url: r.secure_url,
                    folder: r.folder,
                    format: r.format,
                    resource_type: r.resource_type,
                    width: r.width,
                    height: r.height,
                    bytes: r.bytes,
                    duration: r.duration,
                    tags: r.tags || [],
                    context: r.context || {},
                    aspect_ratio: r.aspect_ratio,
                    score: r.score,
                })),
                total: scored.length,
                query,
                keywords: keywords.slice(0, 10),
            }, { headers: { "Cache-Control": "s-maxage=60" } });
        }

        const data = await response.json();
        const results = (data.resources || []).map((r: { public_id: string; secure_url: string; folder?: string; asset_folder?: string; format: string; resource_type: string; width: number; height: number; bytes: number; duration?: number; tags?: string[]; context?: Record<string, string>; aspect_ratio?: number }) => ({
            public_id: r.public_id,
            secure_url: r.secure_url,
            folder: r.asset_folder || r.folder || "",
            format: r.format,
            resource_type: r.resource_type,
            width: r.width,
            height: r.height,
            bytes: r.bytes,
            duration: r.duration,
            tags: r.tags || [],
            context: r.context || {},
            aspect_ratio: r.aspect_ratio || (r.width && r.height ? +(r.width / r.height).toFixed(4) : undefined),
            score: scoreMatch(r.public_id, r.asset_folder || r.folder || "", keywords),
        }));

        results.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

        return NextResponse.json({
            results,
            total: results.length,
            query,
            keywords: keywords.slice(0, 10),
        }, { headers: { "Cache-Control": "s-maxage=60" } });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Collection search error:", message);
        return NextResponse.json({ error: message, results: [], total: 0 }, { status: 500 });
    }
}
