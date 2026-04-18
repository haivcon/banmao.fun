import type { Metadata, ResolvingMetadata } from "next";
import CollectionClient from "./CollectionClient";

type Props = {
    params: { [key: string]: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const imgName = searchParams.img;
    let ogImage = "https://www.banmao.fun/media/banner.png"; // Default fallback banner

    if (imgName && typeof imgName === "string") {
        const cleanName = imgName.replace(/[^a-zA-Z0-9_-]/g, ""); // basic sanitize
        ogImage = `https://res.cloudinary.com/dtg0czl2b/image/upload/w_800,c_fill,q_auto/v1/banmao/${cleanName}.png`;
    }

    const titleStr = imgName ? `Banmao Collection - ${imgName}` : "Banmao Collection";
    const descStr = imgName ? "Shared Banmao 3D Sticker from the official collection." : "Explore the Banmao 3D sticker collection and media hub.";

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
