// app/api/slots/leaderboard/route.ts
// API for fetching slots leaderboard (top winners) and updating player profiles
import { NextRequest, NextResponse } from "next/server";
import { getSlotsLeaderboard, updateSlotsPlayerProfile, getSlotsPlayerByAddress } from "../../../../lib/db";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sortBy') || 'biggestWin';

        const leaderboard = await getSlotsLeaderboard(Math.min(limit, 100), sortBy as any);

        return NextResponse.json({
            success: true,
            leaderboard: leaderboard.map((player: any) => ({
                address: player.address,
                name: player.name || `Spinner ${player.address?.slice(0, 6) || ''}`,
                avatar: player.avatar || 0,
                telegram: player.telegram,
                twitter: player.twitter,
                editCount: player.edit_count || 0,
                totalSpins: player.total_spins,
                totalWins: player.total_wins || 0,
                totalWagered: player.total_wagered,
                totalWon: player.total_won,
                biggestWin: player.biggest_win,
                jackpotWins: player.jackpot_wins,
                lastSpinTime: player.last_spin_time,
                // Time-based stats
                todaySpins: player.today_spins || 0,
                todayWon: player.today_won || '0',
                todayWins: player.today_wins || 0
            }))
        });
    } catch (error) {
        console.error('Error fetching slots leaderboard:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}

// Update player profile (name, avatar, telegram, twitter)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, name, avatar, telegram, twitter } = body;

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        const result = await updateSlotsPlayerProfile(
            address,
            name,
            typeof avatar === 'number' ? avatar : undefined,
            telegram,
            twitter
        );

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error,
                editCount: result.editCount
            }, { status: result.error?.includes('limit') ? 403 : 400 });
        }

        return NextResponse.json({
            success: true,
            editCount: result.editCount,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating slots profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}

// Get single player profile
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
        }

        const player = await getSlotsPlayerByAddress(address);

        if (!player) {
            return NextResponse.json({
                success: true,
                player: null,
                message: 'Player not found'
            });
        }

        return NextResponse.json({
            success: true,
            player: {
                address: player.address,
                name: player.name || `Spinner ${player.address?.slice(0, 6) || ''}`,
                avatar: player.avatar || 0,
                telegram: player.telegram,
                twitter: player.twitter,
                editCount: player.edit_count || 0,
                totalSpins: player.total_spins,
                totalWins: player.total_wins || 0,
                totalWagered: player.total_wagered,
                totalWon: player.total_won,
                biggestWin: player.biggest_win,
                jackpotWins: player.jackpot_wins,
                lastSpinTime: player.last_spin_time
            }
        });
    } catch (error) {
        console.error('Error fetching player profile:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch player' }, { status: 500 });
    }
}
