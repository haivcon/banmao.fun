import { TEAMS, getDefaultTeamInfo, type TeamInfo } from "./teamData";

export interface WorldCupGroup {
    group: string;
    codes: string[];
}

export interface WorldCupScheduledMatch {
    id: number;
    teamA: number;
    teamB: number;
    round: string;
    time: string;
    elimination: boolean;
}

export const WORLD_CUP_2026_GROUPS: WorldCupGroup[] = [
    { group: "A", codes: ["MEX", "RSA", "KOR", "CZE"] },
    { group: "B", codes: ["CAN", "BIH", "QAT", "SUI"] },
    { group: "C", codes: ["BRA", "MAR", "HAI", "SCO"] },
    { group: "D", codes: ["USA", "PAR", "AUS", "TUR"] },
    { group: "E", codes: ["GER", "CUW", "CIV", "ECU"] },
    { group: "F", codes: ["NED", "JPN", "SWE", "TUN"] },
    { group: "G", codes: ["BEL", "EGY", "IRN", "NZL"] },
    { group: "H", codes: ["ESP", "CPV", "KSA", "URU"] },
    { group: "I", codes: ["FRA", "SEN", "IRQ", "NOR"] },
    { group: "J", codes: ["ARG", "ALG", "AUT", "JOR"] },
    { group: "K", codes: ["POR", "COD", "UZB", "COL"] },
    { group: "L", codes: ["ENG", "CRO", "GHA", "PAN"] },
];

const TEAM_BY_CODE = new Map(TEAMS.map(team => [team.code, team]));
const GROUP_PAIRINGS = [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
] as const;

export function getWorldCup2026Teams(): TeamInfo[] {
    return WORLD_CUP_2026_GROUPS.flatMap(group =>
        group.codes.map((code, indexInGroup) => {
            const id = WORLD_CUP_2026_GROUPS.indexOf(group) * 4 + indexInGroup;
            const team = TEAM_BY_CODE.get(code) || getDefaultTeamInfo(id);
            return {
                ...team,
                id,
                group: group.group,
            };
        })
    );
}

export function getWorldCup2026MetadataCsv(): string {
    return getWorldCup2026Teams()
        .map(team => [team.id, team.name, team.code, team.group, team.color, team.colorSecondary].join(","))
        .join("\n");
}

export function getWorldCup2026GroupMatches(): WorldCupScheduledMatch[] {
    let id = 1;
    return WORLD_CUP_2026_GROUPS.flatMap((group, groupIndex) => {
        const baseTeamId = groupIndex * 4;
        return GROUP_PAIRINGS.map(([a, b], pairingIndex) => ({
            id: id++,
            teamA: baseTeamId + a,
            teamB: baseTeamId + b,
            round: `Group ${group.group} - Round ${Math.floor(pairingIndex / 2) + 1}`,
            time: "",
            elimination: false,
        }));
    });
}
