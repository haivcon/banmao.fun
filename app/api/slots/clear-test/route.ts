
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function GET(req: NextRequest) {
    try {
        await db.execute({
            sql: "DELETE FROM slots_players WHERE address LIKE '0xTestPlayer%'",
            args: []
        });

        return NextResponse.json({ success: true, message: 'Cleared test players' });
    } catch (error) {
        console.error('Clear test error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
