import { NextRequest, NextResponse } from 'next/server';
import { readdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MASCOTS_DIR = join(process.cwd(), 'public', 'mascots');

// GET /api/mascots — list available mascot files
export async function GET() {
    try {
        if (!existsSync(MASCOTS_DIR)) {
            return NextResponse.json({ files: [] });
        }
        const entries = await readdir(MASCOTS_DIR);
        const files = entries.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).map(f => f.replace(/\.[^.]+$/, ''));
        return NextResponse.json({ files });
    } catch {
        return NextResponse.json({ files: [] });
    }
}

// POST /api/mascots — upload a mascot image
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const code = formData.get('code') as string;
        const file = formData.get('file') as File;
        if (!code || !file) {
            return NextResponse.json({ error: 'Missing code or file' }, { status: 400 });
        }
        const safeCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5);
        if (!safeCode) {
            return NextResponse.json({ error: 'Invalid team code' }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const allowed = ['png', 'jpg', 'jpeg', 'webp'];
        if (!allowed.includes(ext)) {
            return NextResponse.json({ error: 'Only png/jpg/webp allowed' }, { status: 400 });
        }
        await writeFile(join(MASCOTS_DIR, `${safeCode}.${ext === 'jpeg' ? 'jpg' : ext}`), new Uint8Array(buffer));
        // Also save as .png for consistency if not already png
        if (ext !== 'png') {
            await writeFile(join(MASCOTS_DIR, `${safeCode}.png`), new Uint8Array(buffer));
        }
        return NextResponse.json({ ok: true, code: safeCode });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// DELETE /api/mascots — remove a mascot image
export async function DELETE(req: NextRequest) {
    try {
        const { code } = await req.json();
        const safeCode = String(code).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5);
        const filePath = join(MASCOTS_DIR, `${safeCode}.png`);
        if (existsSync(filePath)) {
            await unlink(filePath);
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
