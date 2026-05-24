// Default metadata is used only when the contract has not configured a team yet.
export interface TeamInfo {
    id: number;
    name: string;
    code: string;
    group: string;
    color: string;
    colorSecondary: string;
}

export const TEAMS: TeamInfo[] = [
    { id: 0, name: 'United States', code: 'USA', group: 'Host', color: '#1d4ed8', colorSecondary: '#dc2626' },
    { id: 1, name: 'Canada', code: 'CAN', group: 'Host', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 2, name: 'Mexico', code: 'MEX', group: 'Host', color: '#15803d', colorSecondary: '#ef4444' },
    { id: 3, name: 'Japan', code: 'JPN', group: 'AFC', color: '#1d4ed8', colorSecondary: '#f8fafc' },
    { id: 4, name: 'South Korea', code: 'KOR', group: 'AFC', color: '#ef4444', colorSecondary: '#2563eb' },
    { id: 5, name: 'Iran', code: 'IRN', group: 'AFC', color: '#16a34a', colorSecondary: '#dc2626' },
    { id: 6, name: 'Saudi Arabia', code: 'KSA', group: 'AFC', color: '#15803d', colorSecondary: '#ffffff' },
    { id: 7, name: 'Qatar', code: 'QAT', group: 'AFC', color: '#7f1d1d', colorSecondary: '#ffffff' },
    { id: 8, name: 'Australia', code: 'AUS', group: 'AFC', color: '#facc15', colorSecondary: '#166534' },
    { id: 9, name: 'Jordan', code: 'JOR', group: 'AFC', color: '#111827', colorSecondary: '#ef4444' },
    { id: 10, name: 'Iraq', code: 'IRQ', group: 'AFC', color: '#dc2626', colorSecondary: '#16a34a' },
    { id: 11, name: 'Uzbekistan', code: 'UZB', group: 'AFC', color: '#38bdf8', colorSecondary: '#16a34a' },
    { id: 12, name: 'Senegal', code: 'SEN', group: 'CAF', color: '#16a34a', colorSecondary: '#facc15' },
    { id: 13, name: 'Morocco', code: 'MAR', group: 'CAF', color: '#be123c', colorSecondary: '#16a34a' },
    { id: 14, name: 'Egypt', code: 'EGY', group: 'CAF', color: '#dc2626', colorSecondary: '#111827' },
    { id: 15, name: 'Tunisia', code: 'TUN', group: 'CAF', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 16, name: 'Algeria', code: 'ALG', group: 'CAF', color: '#15803d', colorSecondary: '#ffffff' },
    { id: 17, name: 'Ivory Coast', code: 'CIV', group: 'CAF', color: '#f97316', colorSecondary: '#16a34a' },
    { id: 18, name: 'Ghana', code: 'GHA', group: 'CAF', color: '#facc15', colorSecondary: '#111827' },
    { id: 19, name: 'South Africa', code: 'RSA', group: 'CAF', color: '#16a34a', colorSecondary: '#facc15' },
    { id: 20, name: 'Cabo Verde', code: 'CPV', group: 'CAF', color: '#2563eb', colorSecondary: '#facc15' },
    { id: 21, name: 'DR Congo', code: 'COD', group: 'CAF', color: '#38bdf8', colorSecondary: '#dc2626' },
    { id: 22, name: 'England', code: 'ENG', group: 'UEFA', color: '#cf081f', colorSecondary: '#ffffff' },
    { id: 23, name: 'France', code: 'FRA', group: 'UEFA', color: '#002395', colorSecondary: '#ed2939' },
    { id: 24, name: 'Spain', code: 'ESP', group: 'UEFA', color: '#aa151b', colorSecondary: '#f1bf00' },
    { id: 25, name: 'Portugal', code: 'POR', group: 'UEFA', color: '#006600', colorSecondary: '#ff0000' },
    { id: 26, name: 'Germany', code: 'GER', group: 'UEFA', color: '#111827', colorSecondary: '#dd0000' },
    { id: 27, name: 'Netherlands', code: 'NED', group: 'UEFA', color: '#f97316', colorSecondary: '#1d4ed8' },
    { id: 28, name: 'Croatia', code: 'CRO', group: 'UEFA', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 29, name: 'Belgium', code: 'BEL', group: 'UEFA', color: '#111827', colorSecondary: '#ef4444' },
    { id: 30, name: 'Switzerland', code: 'SUI', group: 'UEFA', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 31, name: 'Scotland', code: 'SCO', group: 'UEFA', color: '#2563eb', colorSecondary: '#ffffff' },
    { id: 32, name: 'Austria', code: 'AUT', group: 'UEFA', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 33, name: 'Norway', code: 'NOR', group: 'UEFA', color: '#dc2626', colorSecondary: '#1d4ed8' },
    { id: 34, name: 'Sweden', code: 'SWE', group: 'UEFA', color: '#2563eb', colorSecondary: '#facc15' },
    { id: 35, name: 'Turkey', code: 'TUR', group: 'UEFA', color: '#dc2626', colorSecondary: '#ffffff' },
    { id: 36, name: 'Bosnia & Herzegovina', code: 'BIH', group: 'UEFA', color: '#2563eb', colorSecondary: '#facc15' },
    { id: 37, name: 'Czechia', code: 'CZE', group: 'UEFA', color: '#2563eb', colorSecondary: '#dc2626' },
    { id: 38, name: 'Argentina', code: 'ARG', group: 'CONMEBOL', color: '#75aadb', colorSecondary: '#ffffff' },
    { id: 39, name: 'Brazil', code: 'BRA', group: 'CONMEBOL', color: '#009c3b', colorSecondary: '#ffdf00' },
    { id: 40, name: 'Uruguay', code: 'URU', group: 'CONMEBOL', color: '#38bdf8', colorSecondary: '#facc15' },
    { id: 41, name: 'Colombia', code: 'COL', group: 'CONMEBOL', color: '#facc15', colorSecondary: '#2563eb' },
    { id: 42, name: 'Ecuador', code: 'ECU', group: 'CONMEBOL', color: '#facc15', colorSecondary: '#2563eb' },
    { id: 43, name: 'Paraguay', code: 'PAR', group: 'CONMEBOL', color: '#dc2626', colorSecondary: '#2563eb' },
    { id: 44, name: 'Panama', code: 'PAN', group: 'CONCACAF', color: '#dc2626', colorSecondary: '#2563eb' },
    { id: 45, name: 'Haiti', code: 'HAI', group: 'CONCACAF', color: '#1d4ed8', colorSecondary: '#dc2626' },
    { id: 46, name: 'Curacao', code: 'CUW', group: 'CONCACAF', color: '#2563eb', colorSecondary: '#facc15' },
    { id: 47, name: 'New Zealand', code: 'NZL', group: 'OFC', color: '#111827', colorSecondary: '#ffffff' },
];

export const TEAM_BY_ID: Record<number, TeamInfo> = Object.fromEntries(TEAMS.map(t => [t.id, t]));
export const NUM_TEAMS = TEAMS.length;

const FALLBACK_COLORS = [
    ['#009c3b', '#ffdf00'],
    ['#002395', '#ed2939'],
    ['#75aadb', '#ffffff'],
    ['#cf081f', '#ffffff'],
    ['#aa151b', '#f1bf00'],
    ['#111827', '#dd0000'],
    ['#006600', '#ff0000'],
    ['#008c45', '#0066cc'],
    ['#0f766e', '#38bdf8'],
    ['#7c3aed', '#f472b6'],
    ['#b45309', '#facc15'],
    ['#1d4ed8', '#93c5fd'],
];

export function getDefaultTeamInfo(id: number): TeamInfo {
    const known = TEAM_BY_ID[id];
    if (known) return known;
    const [color, colorSecondary] = FALLBACK_COLORS[id % FALLBACK_COLORS.length];
    const number = String(id + 1).padStart(2, '0');
    return {
        id,
        name: `Team ${number}`,
        code: `T${number}`,
        group: '-',
        color,
        colorSecondary,
    };
}

export function getTeamMetadataCsv(count = 48): string {
    return Array.from({ length: Math.min(count, TEAMS.length) }, (_, id) => {
        const team = getDefaultTeamInfo(id);
        return [team.id, team.name, team.code, team.group, team.color, team.colorSecondary].join(',');
    }).join('\n');
}

export type TeamStatus = 'active' | 'champion' | 'eliminated' | 'locked';

export function getTeamStatus(statusCode: number, locked: boolean): TeamStatus {
    if (locked) return 'locked';
    if (statusCode === 1) return 'champion';
    if (statusCode === 2) return 'eliminated';
    return 'active';
}
