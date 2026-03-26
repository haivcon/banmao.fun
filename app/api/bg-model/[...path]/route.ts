import { NextRequest, NextResponse } from "next/server";

const CDN_LIST = [
    "https://unpkg.com/@imgly/background-removal-data@1.7.0/dist/",
    "https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/",
    "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
];

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const segments = path.join("/");

    for (const cdn of CDN_LIST) {
        const cdnUrl = cdn + segments;
        try {
            const resp = await fetch(cdnUrl, {
                headers: { Accept: "*/*" },
            });

            if (!resp.ok) {
                console.warn(`[bg-model] ${cdnUrl} returned ${resp.status}, trying next...`);
                continue;
            }

            const data = await resp.arrayBuffer();
            const contentType =
                resp.headers.get("content-type") || "application/octet-stream";

            return new NextResponse(data, {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Cache-Control": "public, max-age=604800, immutable",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        } catch (err) {
            console.warn(`[bg-model] ${cdnUrl} failed:`, err);
            continue;
        }
    }

    return NextResponse.json(
        { error: "All CDN sources failed" },
        { status: 502 }
    );
}
