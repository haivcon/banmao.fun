// app/api/hub/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { reportPost } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { postId, address, reason } = await req.json();
        if (!postId || !address) return NextResponse.json({ error: 'postId and address required' }, { status: 400 });
        const result = await reportPost(Number(postId), address, reason || '');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
