import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { createDefaultWorldCup2026Bracket, type BracketState } from "@/app/gamefi/worldcup/lib/worldCup2026Bracket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS worldcup_bracket_state (
    season_id INTEGER PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

function getTursoClient() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) return null;
    return createClient({ url, authToken });
}

async function ensureTable(client: ReturnType<typeof createClient>) {
    await client.execute(TABLE_SQL);
}

export async function GET(req: NextRequest) {
    const seasonId = Number(req.nextUrl.searchParams.get("seasonId") || 1);
    const client = getTursoClient();
    if (!client) {
        return NextResponse.json({
            state: createDefaultWorldCup2026Bracket(seasonId),
            source: "default",
            warning: "Turso is not configured",
        });
    }

    await ensureTable(client);
    const result = await client.execute({
        sql: "SELECT payload, updated_at FROM worldcup_bracket_state WHERE season_id = ?",
        args: [seasonId],
    });
    const row = result.rows[0];
    if (!row) {
        return NextResponse.json({ state: createDefaultWorldCup2026Bracket(seasonId), source: "default" });
    }

    const state = JSON.parse(String(row.payload)) as BracketState;
    state.updatedAt = String(row.updated_at || "");
    return NextResponse.json({ state, source: "turso" });
}

export async function PUT(req: NextRequest) {
    const state = await req.json() as BracketState;
    if (!state || !Array.isArray(state.rounds) || !Number.isInteger(state.seasonId)) {
        return NextResponse.json({ error: "Invalid bracket state" }, { status: 400 });
    }

    const client = getTursoClient();
    if (!client) {
        return NextResponse.json({ error: "Turso is not configured" }, { status: 500 });
    }

    await ensureTable(client);
    await client.execute({
        sql: `
            INSERT INTO worldcup_bracket_state (season_id, payload, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(season_id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = CURRENT_TIMESTAMP
        `,
        args: [state.seasonId, JSON.stringify(state)],
    });

    return NextResponse.json({ ok: true });
}
