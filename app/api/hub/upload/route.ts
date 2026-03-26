// app/api/hub/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - cloudinary types
import { v2 as cloudinary } from 'cloudinary';

// cloudinary auto-configures from CLOUDINARY_URL env var

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const address = formData.get('address') as string;

        if (!file || !address) {
            return NextResponse.json({ error: 'file and address required' }, { status: 400 });
        }

        // Validate file size (10MB for images, 50MB for videos)
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({ error: `File too large. Max ${isVideo ? '50MB' : '10MB'}` }, { status: 400 });
        }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        const shortAddr = address.slice(0, 10).toLowerCase();
        const result = await new Promise<{ secure_url: string; resource_type: string; width: number; height: number }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `banmao/hub/${shortAddr}`,
                    resource_type: isVideo ? 'video' : 'image',
                    transformation: isVideo ? undefined : [{ quality: 'auto', fetch_format: 'auto' }],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result as any);
                }
            );
            uploadStream.end(buffer);
        });

        // Generate thumbnail
        let thumbUrl = result.secure_url;
        if (!isVideo) {
            thumbUrl = result.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto/');
        } else {
            thumbUrl = result.secure_url.replace(/\.\w+$/, '.jpg').replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto,so_0/');
        }

        return NextResponse.json({
            success: true,
            mediaUrl: result.secure_url,
            thumbUrl,
            mediaType: isVideo ? 'video' : 'image',
        });
    } catch (error) {
        console.error('Hub upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
