import type { Metadata, ResolvingMetadata } from "next";
import CollectionClient from "./CollectionClient";

type Props = {
    params: { [key: string]: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

function parseCloudinaryUrl() {
    const url = process.env.CLOUDINARY_URL;
    if (!url) return null;
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    if (!match) return null;
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

async function fetchOpenGraphImage(filename: string): Promise<string | null> {
    const creds = parseCloudinaryUrl();
    if (!creds) return null;

    const cleanName = filename.replace(/[^a-zA-Z0-9_ -]/g, "");
    const terms = cleanName.split(/_|-|\s/g).filter(Boolean);
    const expression = `folder:banmao* AND ${terms.join(" AND ")}`;
    const searchUrl = `https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/search`;
    const authHeader = "Basic " + Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");

    try {
        const response = await fetch(searchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ expression, max_results: 1 })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.resources && data.resources.length > 0) {
                const img = data.resources[0];
                if (img.resource_type === "video") {
                    return img.secure_url.replace("/video/upload/", "/video/upload/c_fill,w_800,h_800,f_jpg,q_auto/").replace(/\.[^.]+$/, ".jpg");
                }
                return img.secure_url.replace("/upload/", "/upload/c_fill,w_800,h_800,f_auto,q_auto/");
            }
        }
    } catch {
        return null;
    }
    return null;
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const imgName = searchParams.img;
    let ogImage = "https://www.banmao.fun/pwa/main/icon-512x512.png"; // Fixed robust fallback

    if (imgName && typeof imgName === "string") {
        const cleanName = imgName.replace(/[^a-zA-Z0-9_ -]/g, ""); // basic sanitize
        try {
            const fetchedImage = await fetchOpenGraphImage(cleanName);
            if (fetchedImage) {
                ogImage = fetchedImage;
            }
        } catch {
            // fail gracefully and use fallback
        }
    }

    const titleStr = imgName ? `Banmao Collection - ${imgName}` : "Banmao Collection";
    const descStr = imgName ? `Shared Banmao 3D Sticker from the official collection.` : "Explore the Banmao 3D sticker collection and media hub.";

    return {
        title: titleStr,
        description: descStr,
        openGraph: {
            title: titleStr,
            description: descStr,
            images: [
                {
                    url: ogImage,
                    width: 800,
                    height: 800,
                }
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: titleStr,
            description: descStr,
            images: [ogImage],
        }
    };
}

export default function CollectionPage() {
    return <CollectionClient />;
}
