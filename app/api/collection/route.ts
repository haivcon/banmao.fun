import { NextResponse } from "next/server";

/**
 * GET /api/collection
 *
 * Cloudinary Search API with optional pagination.
 *
 * Query params:
 *   ?folder=banmao           — searches banmao and all subfolders
 *   ?limit=100&cursor=abc    — paginated mode (returns nextCursor)
 *   ?folders_only=true       — returns unique folders only (no images)
 *
 * Without limit: fetches ALL images (backward compatible).
 * With limit: returns up to `limit` images + nextCursor for pagination.
 *
 * CLOUDINARY_URL env: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */

function parseCloudinaryUrl() {
    const url = process.env.CLOUDINARY_URL;
    if (!url) throw new Error("CLOUDINARY_URL is not set");
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (!match) throw new Error("Invalid CLOUDINARY_URL format");
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

interface CloudinaryResource {
    public_id: string;
    secure_url: string;
    format: string;
    resource_type: string;
    width: number;
    height: number;
    bytes: number;
    duration?: number;
    created_at: string;
    asset_folder?: string;
    folder?: string;
    tags?: string[];
    context?: Record<string, string>;
    aspect_ratio?: number;
}

function mapResource(r: CloudinaryResource) {
    return {
        public_id: r.public_id,
        secure_url: r.secure_url,
        format: r.format,
        resource_type: r.resource_type || "image",
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        duration: r.duration,
        created_at: r.created_at,
        folder: r.asset_folder || r.folder || "",
        tags: r.tags || [],
        context: r.context || {},
        aspect_ratio: r.aspect_ratio || (r.width && r.height ? +(r.width / r.height).toFixed(4) : undefined),
    };
}

const CACHE_HEADERS = { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" };

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get("folder") || "";
        const limitParam = searchParams.get("limit");
        const cursorParam = searchParams.get("cursor");
        const foldersOnly = searchParams.get("folders_only") === "true";

        const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();
        const expression = folder ? `folder:${folder}*` : "resource_type:image";
        const searchUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
        const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

        // ——— Paginated mode: returns one page at a time ———
        if (limitParam) {
            const limit = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500);
            const body: Record<string, unknown> = {
                expression,
                max_results: limit,
                sort_by: [{ public_id: "asc" }],
                with_field: ["tags", "context"],
            };
            if (cursorParam) body.next_cursor = cursorParam;

            const response = await fetch(searchUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Cloudinary API error:", response.status, errorText);
                return NextResponse.json({ error: "Cloudinary API error", details: errorText }, { status: response.status });
            }

            const data = await response.json();
            const images = (data.resources || []).map(mapResource);
            const totalCount = data.total_count || 0;

            // Extract unique folders from this batch
            const batchFolders = [...new Set(images.map((img: { folder: string }) => img.folder))] as string[];

            return NextResponse.json(
                { total: totalCount, images, nextCursor: data.next_cursor || null, folders: batchFolders },
                { headers: CACHE_HEADERS }
            );
        }

        // ——— Full fetch mode (backward compatible) ———
        let allResources: CloudinaryResource[] = [];
        let nextCursor: string | undefined;

        do {
            const body: Record<string, unknown> = {
                expression,
                max_results: 500,
                sort_by: [{ public_id: "asc" }],
                with_field: ["tags", "context"],
            };
            if (nextCursor) body.next_cursor = nextCursor;

            const response = await fetch(searchUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Cloudinary API error:", response.status, errorText);
                return NextResponse.json({ error: "Cloudinary API error", details: errorText }, { status: response.status });
            }

            const data = await response.json();
            allResources = allResources.concat(data.resources || []);
            nextCursor = data.next_cursor;
        } while (nextCursor);

        const images = allResources.map(mapResource);

        // Extract unique folders
        const folders = [...new Set(images.map((img) => img.folder))] as string[];

        // Folders-only mode
        if (foldersOnly) {
            return NextResponse.json({ folders, totalCount: images.length }, { headers: CACHE_HEADERS });
        }

        return NextResponse.json(
            { total: images.length, images, folders },
            { headers: CACHE_HEADERS }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Collection API error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
