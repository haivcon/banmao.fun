import { NextRequest, NextResponse } from "next/server";
// @ts-ignore Cloudinary's package does not expose complete route-handler types.
import { v2 as cloudinary } from "cloudinary";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File) || !file.type.startsWith("image/")) {
            return NextResponse.json({ error: "An image file is required" }, { status: 400 });
        }
        if (file.size > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: "Image must be 2 MB or smaller" }, { status: 400 });
        }
        if (!process.env.CLOUDINARY_URL) {
            return NextResponse.json({ error: "Image uploads are not configured" }, { status: 503 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "banmao/launchpad",
                    resource_type: "image",
                    transformation: [{ width: 512, height: 512, crop: "limit", quality: "auto", fetch_format: "auto" }],
                },
                (error, upload) => error ? reject(error) : resolve(upload as { secure_url: string })
            );
            stream.end(buffer);
        });

        if (result.secure_url.length > 256) {
            return NextResponse.json({ error: "Generated image URL is too long" }, { status: 500 });
        }
        return NextResponse.json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error("Launchpad image upload failed", error);
        return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
    }
}
