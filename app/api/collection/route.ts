import { NextResponse } from "next/server";

/**
 * GET /api/collection
 *
 * Uses the Cloudinary Search API to list ALL image resources inside
 * a folder tree (recursive). Handles pagination automatically to
 * fetch beyond the 500-per-request limit.
 *
 * Query params:
 *   ?folder=banmao   (searches banmao and all subfolders)
 *
 * The CLOUDINARY_URL env var is parsed for credentials:
 *   cloudinary://API_KEY:API_SECRET@CLOUD_NAME
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
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get("folder") || "";

        const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();

        const expression = folder
            ? `folder:${folder}*`
            : "resource_type:image";

        const searchUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;
        const authHeader =
            "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

        // Fetch all pages (max 500 per request)
        let allResources: CloudinaryResource[] = [];
        let nextCursor: string | undefined;

        do {
            const body: Record<string, unknown> = {
                expression,
                max_results: 500,
                sort_by: [{ public_id: "asc" }],
            };
            if (nextCursor) body.next_cursor = nextCursor;

            const response = await fetch(searchUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Cloudinary API error:", response.status, errorText);
                return NextResponse.json(
                    { error: "Cloudinary API error", details: errorText },
                    { status: response.status },
                );
            }

            const data = await response.json();
            allResources = allResources.concat(data.resources || []);
            nextCursor = data.next_cursor;
        } while (nextCursor);

        // Map to a simple structure for the frontend
        const images = allResources.map((r) => ({
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
        }));

        return NextResponse.json(
            { total: images.length, images },
            { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" } },
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Collection API error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
