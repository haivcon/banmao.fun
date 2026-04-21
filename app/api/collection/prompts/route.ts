import { NextResponse } from "next/server";

/**
 * GET /api/collection/prompts
 *
 * Fetches prompt.txt and share_links.txt from Cloudinary for a given folder.
 * These files contain the AI prompts used to generate images and their Gemini share links.
 *
 * Query params:
 *   ?folder=banmao/GroupX  — the folder to search in
 *
 * Returns:
 *   { prompts: [{id, prompt, share_link}], shareLinks: {filename: url}, folder }
 */

function parseCloudinaryUrl() {
    const url = process.env.CLOUDINARY_URL;
    if (!url) throw new Error("CLOUDINARY_URL is not set");
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (!match) throw new Error("Invalid CLOUDINARY_URL format");
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

const CACHE_HEADERS = { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" };
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get("folder");

        if (!folder) {
            return NextResponse.json({ error: "Missing folder parameter" }, { status: 400 });
        }

        const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl();
        const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
        const searchUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;

        // Search for raw resources (prompt.txt, share_links.txt) in the folder and its a_prompt subfolder
        const foldersToSearch = [folder, `${folder}/a_prompt`];
        let promptData: { id: number; prompt: string; share_link?: string }[] = [];
        let shareLinksMap: Record<string, string> = {};
        let foundPromptFile = false;
        let foundShareLinksFile = false;

        for (const searchFolder of foldersToSearch) {
            if (foundPromptFile && foundShareLinksFile) break;

            // Search for raw resources in this folder
            const expression = `folder:${searchFolder} AND resource_type:raw`;
            const response = await fetch(searchUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({
                    expression,
                    max_results: 20,
                    sort_by: [{ public_id: "asc" }],
                }),
            });

            if (!response.ok) continue;
            const data = await response.json();

            for (const resource of data.resources || []) {
                const publicId = resource.public_id || "";
                const secureUrl = resource.secure_url || "";

                // Check for prompt.txt
                if (!foundPromptFile && (publicId.endsWith("/prompt") || publicId.endsWith("/prompt.txt"))) {
                    try {
                        // Fetch the raw file content
                        const txtUrl = secureUrl || `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}.txt`;
                        const textResp = await fetch(txtUrl);
                        if (textResp.ok) {
                            const text = await textResp.text();
                            try {
                                // Try JSON parse first (standard format)
                                promptData = JSON.parse(text);
                                foundPromptFile = true;
                            } catch {
                                // If not JSON, try line-by-line format
                                const lines = text.split("\n").filter(l => l.trim());
                                promptData = lines.map((line, idx) => ({
                                    id: idx + 1,
                                    prompt: line.trim(),
                                }));
                                foundPromptFile = true;
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch prompt.txt:", e);
                    }
                }

                // Check for share_links.txt
                if (!foundShareLinksFile && (publicId.endsWith("/share_links") || publicId.endsWith("/share_links.txt"))) {
                    try {
                        const txtUrl = secureUrl || `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}.txt`;
                        const textResp = await fetch(txtUrl);
                        if (textResp.ok) {
                            const text = await textResp.text();
                            const lines = text.split("\n").filter(l => l.trim());
                            for (const line of lines) {
                                const colonIdx = line.indexOf(": ");
                                if (colonIdx > 0) {
                                    const filename = line.substring(0, colonIdx).trim();
                                    const url = line.substring(colonIdx + 2).trim();
                                    if (url.startsWith("http")) {
                                        shareLinksMap[filename] = url;
                                    }
                                }
                            }
                            foundShareLinksFile = true;
                        }
                    } catch (e) {
                        console.error("Failed to fetch share_links.txt:", e);
                    }
                }
            }
        }

        // If prompt.txt has share_link fields, merge them into shareLinksMap for redundancy
        if (promptData.length > 0) {
            for (const p of promptData) {
                if (p.share_link && typeof p.share_link === "string") {
                    // Store by prompt id
                    shareLinksMap[`prompt_${p.id}`] = p.share_link;
                }
            }
        }

        return NextResponse.json(
            {
                prompts: promptData,
                shareLinks: shareLinksMap,
                folder,
                hasPrompts: foundPromptFile,
                hasShareLinks: foundShareLinksFile,
            },
            { headers: CACHE_HEADERS }
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Prompts API error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
