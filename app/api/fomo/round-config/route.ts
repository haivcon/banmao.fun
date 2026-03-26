/**
 * API Route: /api/fomo/round-config
 * GET  ?rounds=1,2,3  → Returns per-round configs from DB
 * POST {roundId, config} → Saves config snapshot for a round (INSERT OR IGNORE)
 */
import { NextRequest, NextResponse } from "next/server";
import { upsertFomoRoundConfig, getFomoRoundConfigs } from "../../../../lib/db";

// GET: Fetch configs for multiple rounds
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const roundsParam = searchParams.get("rounds");

        if (!roundsParam) {
            return NextResponse.json({ error: "Missing 'rounds' parameter" }, { status: 400 });
        }

        const roundIds = roundsParam
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n) && n > 0);

        if (roundIds.length === 0) {
            return NextResponse.json({ configs: {} });
        }

        // Cap at 50 rounds per request
        const limitedIds = roundIds.slice(0, 50);
        const configs = await getFomoRoundConfigs(limitedIds);

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("[API] fomo/round-config GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Save config snapshot for a round
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roundId, config } = body;

        if (!roundId || !config || !config.attackCost) {
            return NextResponse.json({ error: "Missing roundId or config.attackCost" }, { status: 400 });
        }

        const roundNum = Number(roundId);
        if (isNaN(roundNum) || roundNum < 1) {
            return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });
        }

        const result = await upsertFomoRoundConfig(roundNum, {
            attackCost: String(config.attackCost),
            softDuration: config.softDuration ? Number(config.softDuration) : undefined,
            initialHardDuration: config.initialHardDuration ? Number(config.initialHardDuration) : undefined,
            timeDecreaseStep: config.timeDecreaseStep ? Number(config.timeDecreaseStep) : undefined,
            maxAttacksPerRound: config.maxAttacksPerRound ? Number(config.maxAttacksPerRound) : undefined,
            winnerPercent: config.winnerPercent ? Number(config.winnerPercent) : undefined,
            topAttackersPercent: config.topAttackersPercent ? Number(config.topAttackersPercent) : undefined,
            minAttacksForReward: config.minAttacksForReward ? Number(config.minAttacksForReward) : undefined,
            claimExpirationTime: config.claimExpirationTime ? Number(config.claimExpirationTime) : undefined,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[API] fomo/round-config POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
