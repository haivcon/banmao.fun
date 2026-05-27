import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { readFile } from "fs/promises";
import { join } from "path";
import { parseFixtureCsv, type WorldCupFixture } from "@/app/gamefi/worldcup/lib/worldCup2026Fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS worldcup_fixtures (
    season_id INTEGER NOT NULL,
    match_no INTEGER NOT NULL,
    group_name TEXT NOT NULL,
    kickoff_utc TEXT NOT NULL,
    source_time TEXT NOT NULL,
    source_timezone TEXT NOT NULL,
    team_a_code TEXT NOT NULL,
    team_b_code TEXT NOT NULL,
    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER NOT NULL,
    score_a INTEGER,
    score_b INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (season_id, match_no)
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

async function readDefaultFixtures(seasonId: number) {
    const csv = await readFile(join(process.cwd(), "test", "lịch thi.csv"), "utf8");
    return parseFixtureCsv(csv, seasonId);
}

function rowToFixture(row: Record<string, unknown>): WorldCupFixture {
    return {
        id: Number(row.match_no),
        seasonId: Number(row.season_id),
        groupName: String(row.group_name),
        matchNo: Number(row.match_no),
        kickoffUtc: String(row.kickoff_utc),
        sourceTime: String(row.source_time),
        sourceTimezone: String(row.source_timezone),
        teamACode: String(row.team_a_code),
        teamBCode: String(row.team_b_code),
        teamAId: Number(row.team_a_id),
        teamBId: Number(row.team_b_id),
        scoreA: row.score_a === null ? null : Number(row.score_a),
        scoreB: row.score_b === null ? null : Number(row.score_b),
        status: String(row.status || "scheduled") as WorldCupFixture["status"],
    };
}

export async function GET(req: NextRequest) {
    const seasonId = Number(req.nextUrl.searchParams.get("seasonId") || 1);
    const client = getTursoClient();
    if (!client) {
        return NextResponse.json({ fixtures: await readDefaultFixtures(seasonId), source: "csv", warning: "Turso is not configured" });
    }

    await ensureTable(client);
    const result = await client.execute({
        sql: "SELECT * FROM worldcup_fixtures WHERE season_id = ? ORDER BY match_no ASC",
        args: [seasonId],
    });
    if (result.rows.length === 0) {
        return NextResponse.json({ fixtures: await readDefaultFixtures(seasonId), source: "csv" });
    }
    return NextResponse.json({ fixtures: result.rows.map(row => rowToFixture(row as Record<string, unknown>)), source: "turso" });
}

export async function POST(req: NextRequest) {
    const seasonId = Number(req.nextUrl.searchParams.get("seasonId") || 1);
    const fixtures = await readDefaultFixtures(seasonId);
    const client = getTursoClient();
    if (!client) return NextResponse.json({ error: "Turso is not configured" }, { status: 500 });

    await ensureTable(client);
    const tx = await client.transaction("write");
    try {
        for (const item of fixtures) {
            await tx.execute({
                sql: `
                    INSERT INTO worldcup_fixtures (
                        season_id, match_no, group_name, kickoff_utc, source_time, source_timezone,
                        team_a_code, team_b_code, team_a_id, team_b_id, score_a, score_b, status, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(season_id, match_no) DO UPDATE SET
                        group_name = excluded.group_name,
                        kickoff_utc = excluded.kickoff_utc,
                        source_time = excluded.source_time,
                        source_timezone = excluded.source_timezone,
                        team_a_code = excluded.team_a_code,
                        team_b_code = excluded.team_b_code,
                        team_a_id = excluded.team_a_id,
                        team_b_id = excluded.team_b_id,
                        updated_at = CURRENT_TIMESTAMP
                `,
                args: [
                    item.seasonId, item.matchNo, item.groupName, item.kickoffUtc, item.sourceTime, item.sourceTimezone,
                    item.teamACode, item.teamBCode, item.teamAId, item.teamBId, item.scoreA, item.scoreB, item.status,
                ],
            });
        }
        await tx.commit();
        return NextResponse.json({ ok: true, imported: fixtures.length });
    } catch (err) {
        await tx.rollback();
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const fixture = await req.json() as Partial<WorldCupFixture>;
    if (!Number.isInteger(fixture.seasonId) || !Number.isInteger(fixture.matchNo)) {
        return NextResponse.json({ error: "Invalid fixture" }, { status: 400 });
    }
    const seasonId = Number(fixture.seasonId);
    const matchNo = Number(fixture.matchNo);
    const client = getTursoClient();
    if (!client) return NextResponse.json({ error: "Turso is not configured" }, { status: 500 });
    await ensureTable(client);
    await client.execute(
        `
            UPDATE worldcup_fixtures
            SET score_a = ?, score_b = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE season_id = ? AND match_no = ?
        `,
        [fixture.scoreA ?? null, fixture.scoreB ?? null, fixture.status || "scheduled", seasonId, matchNo],
    );
    return NextResponse.json({ ok: true });
}
