export interface BracketSlot {
    teamId: number | null;
    label: string;
}

export interface BracketMatch {
    id: string;
    teamA: BracketSlot;
    teamB: BracketSlot;
    winnerId: number | null;
    scoreA: string;
    scoreB: string;
    contractMatchId: string;
}

export interface BracketRound {
    id: string;
    title: string;
    matches: BracketMatch[];
}

export interface BracketState {
    seasonId: number;
    rounds: BracketRound[];
    updatedAt?: string;
}

export interface BracketSeedTeam {
    id: number;
    group?: string;
}

const R32_PAIRINGS = [
    ["A1", "B2"], ["C1", "D2"], ["E1", "F2"], ["G1", "H2"],
    ["I1", "J2"], ["K1", "L2"], ["B1", "A2"], ["D1", "C2"],
    ["F1", "E2"], ["H1", "G2"], ["J1", "I2"], ["L1", "K2"],
    ["A3/B3/C3", "D3/E3/F3"], ["G3/H3/I3", "J3/K3/L3"], ["Best 3rd", "Best 3rd"], ["Best 3rd", "Best 3rd"],
] as const;

const ROUND_DEFS = [
    { id: "r32", title: "Round of 32", count: 16 },
    { id: "r16", title: "Round of 16", count: 8 },
    { id: "qf", title: "Quarter-finals", count: 4 },
    { id: "sf", title: "Semi-finals", count: 2 },
    { id: "final", title: "Final", count: 1 },
] as const;

function emptyMatch(roundId: string, index: number, teamA: string, teamB: string): BracketMatch {
    return {
        id: `${roundId}-${index + 1}`,
        teamA: { teamId: null, label: teamA },
        teamB: { teamId: null, label: teamB },
        winnerId: null,
        scoreA: "",
        scoreB: "",
        contractMatchId: "",
    };
}

export function createDefaultWorldCup2026Bracket(seasonId = 1): BracketState {
    return {
        seasonId,
        rounds: ROUND_DEFS.map(round => ({
            id: round.id,
            title: round.title,
            matches: Array.from({ length: round.count }, (_, index) => {
                if (round.id === "r32") {
                    const [teamA, teamB] = R32_PAIRINGS[index];
                    return emptyMatch(round.id, index, teamA, teamB);
                }
                return emptyMatch(round.id, index, `Winner ${index * 2 + 1}`, `Winner ${index * 2 + 2}`);
            }),
        })),
    };
}

export function advanceBracketWinner(state: BracketState, roundIndex: number, matchIndex: number, winnerId: number | null): BracketState {
    const next = structuredClone(state) as BracketState;
    const match = next.rounds[roundIndex]?.matches[matchIndex];
    if (!match) return state;

    match.winnerId = winnerId;
    const nextRound = next.rounds[roundIndex + 1];
    if (!nextRound) return next;

    const nextMatch = nextRound.matches[Math.floor(matchIndex / 2)];
    if (!nextMatch) return next;

    const target = matchIndex % 2 === 0 ? nextMatch.teamA : nextMatch.teamB;
    target.teamId = winnerId;
    target.label = winnerId === null ? `Winner ${matchIndex + 1}` : target.label;

    for (let i = roundIndex + 1; i < next.rounds.length; i++) {
        next.rounds[i].matches.forEach(child => {
            if (child.winnerId === match.teamA.teamId || child.winnerId === match.teamB.teamId) child.winnerId = null;
        });
    }
    return next;
}

export function hasSeededTeams(state: BracketState): boolean {
    return state.rounds.some(round => round.matches.some(match => match.teamA.teamId !== null || match.teamB.teamId !== null));
}

export function seedBracketWithTeams(state: BracketState, teams: BracketSeedTeam[]): BracketState {
    const next = structuredClone(state) as BracketState;
    const orderedTeams = [...teams]
        .filter(team => Number.isInteger(team.id))
        .sort((a, b) => String(a.group || "").localeCompare(String(b.group || ""), undefined, { numeric: true }) || a.id - b.id)
        .slice(0, 32);

    const firstRound = next.rounds[0];
    if (!firstRound) return next;

    firstRound.matches.forEach((match, index) => {
        const teamA = orderedTeams[index * 2];
        const teamB = orderedTeams[index * 2 + 1];
        match.teamA.teamId = teamA?.id ?? null;
        match.teamB.teamId = teamB?.id ?? null;
        match.winnerId = null;
    });

    for (let roundIndex = 1; roundIndex < next.rounds.length; roundIndex++) {
        next.rounds[roundIndex].matches.forEach(match => {
            match.teamA.teamId = null;
            match.teamB.teamId = null;
            match.winnerId = null;
            match.scoreA = "";
            match.scoreB = "";
        });
    }

    return next;
}
