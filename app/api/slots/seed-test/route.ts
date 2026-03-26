
import { NextRequest, NextResponse } from 'next/server';
import { db, initializeSlotsDatabase } from '../../../../lib/db';

export async function GET(req: NextRequest) {
    try {
        await initializeSlotsDatabase();

        const dummyPlayers = [];
        const baseAddress = '0xTestPlayer';

        for (let i = 0; i < 100; i++) {
            const address = `${baseAddress}${i.toString().padStart(4, '0')}`;
            const totalSpins = Math.floor(Math.random() * 10000) + 50; // Min 50 for winRate
            const wins = Math.floor(totalSpins * (0.3 + Math.random() * 0.4)); // 30-70% win rate

            // Random BigInt values
            const totalWagered = BigInt(totalSpins) * BigInt(10) * BigInt(1e18); // 10 tokens per spin avg
            const totalWon = BigInt(Math.floor(Number(totalWagered) * (0.8 + Math.random() * 0.4))); // 80-120% RTP

            const highestWin = BigInt(Math.floor(Math.random() * 5000)) * BigInt(1e18);
            const jackpots = Math.random() > 0.8 ? Math.floor(Math.random() * 5) : 0;
            const todayWon = BigInt(Math.floor(Math.random() * 1000)) * BigInt(1e18);

            dummyPlayers.push({
                address,
                name: `Tester #${i + 1}`,
                avatar: Math.floor(Math.random() * 20),
                total_spins: totalSpins,
                total_wins: wins,
                total_won: totalWon.toString(),
                total_wagered: totalWagered.toString(),
                biggest_win: highestWin.toString(),
                jackpots_won: jackpots,
                today_won: todayWon.toString(),
                last_active_day: new Date().toISOString().split('T')[0]
            });
        }

        // Batch insert or loop insert
        for (const p of dummyPlayers) {
            // Check if exists
            const existing = await db.execute({
                sql: 'SELECT address FROM slots_players WHERE address = ?',
                args: [p.address]
            });

            if (existing.rows.length > 0) {
                await db.execute({
                    sql: `UPDATE slots_players SET 
                        total_spins = ?, total_wins = ?, total_won = ?, total_wagered = ?, 
                        biggest_win = ?, jackpot_wins = ?, today_won = ?, last_active_day = ?
                        WHERE address = ?`,
                    args: [p.total_spins, p.total_wins, p.total_won, p.total_wagered,
                    p.biggest_win, p.jackpots_won, p.today_won, p.last_active_day, p.address]
                });
            } else {
                await db.execute({
                    sql: `INSERT INTO slots_players 
                        (address, name, avatar, total_spins, total_wins, total_won, total_wagered, biggest_win, jackpot_wins, today_won, last_active_day)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [p.address, p.name, p.avatar, p.total_spins, p.total_wins, p.total_won, p.total_wagered,
                    p.biggest_win, p.jackpots_won, p.today_won, p.last_active_day]
                });
            }
        }

        return NextResponse.json({ success: true, message: 'Seeded 100 players' });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
