// app/api/hub/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';

async function ensureCheckinTable() {
    await initializeDatabase();
    await db.execute(`
        CREATE TABLE IF NOT EXISTS hub_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_address TEXT NOT NULL,
            checkin_date TEXT NOT NULL,
            streak INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (unixepoch() * 1000),
            UNIQUE(user_address, checkin_date)
        )
    `);
}

function todayStr() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
    try {
        const address = req.nextUrl.searchParams.get('address');
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
        await ensureCheckinTable();

        const today = todayStr();
        const addr = address.toLowerCase();

        // Check if checked in today
        const todayR = await db.execute({
            sql: `SELECT streak FROM hub_checkins WHERE LOWER(user_address) = ? AND checkin_date = ?`,
            args: [addr, today]
        });

        // Get last 7 days of check-ins
        const historyR = await db.execute({
            sql: `SELECT checkin_date FROM hub_checkins WHERE LOWER(user_address) = ? ORDER BY checkin_date DESC LIMIT 7`,
            args: [addr]
        });

        // Map to day-of-week indices (0=Mon, 6=Sun)
        const historyDays = historyR.rows.map((r: any) => {
            const d = new Date(r.checkin_date as string);
            return (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0, Sun=6
        });

        const currentStreak = todayR.rows.length > 0 ? Number(todayR.rows[0].streak) : 0;

        return NextResponse.json({
            streak: currentStreak,
            checkedToday: todayR.rows.length > 0,
            history: historyDays,
        });
    } catch (error) {
        console.error('Checkin GET error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address } = body;
        if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
        await ensureCheckinTable();

        const today = todayStr();
        const yesterday = yesterdayStr();
        const addr = address.toLowerCase();

        // Check if already checked in today
        const existing = await db.execute({
            sql: `SELECT id FROM hub_checkins WHERE LOWER(user_address) = ? AND checkin_date = ?`,
            args: [addr, today]
        });
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Already checked in today', success: false }, { status: 400 });
        }

        // Calculate streak
        const yesterdayR = await db.execute({
            sql: `SELECT streak FROM hub_checkins WHERE LOWER(user_address) = ? AND checkin_date = ?`,
            args: [addr, yesterday]
        });
        const newStreak = yesterdayR.rows.length > 0 ? Number(yesterdayR.rows[0].streak) + 1 : 1;

        await db.execute({
            sql: `INSERT INTO hub_checkins (user_address, checkin_date, streak) VALUES (?, ?, ?)`,
            args: [addr, today, newStreak]
        });

        return NextResponse.json({ success: true, streak: newStreak });
    } catch (error) {
        console.error('Checkin POST error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
