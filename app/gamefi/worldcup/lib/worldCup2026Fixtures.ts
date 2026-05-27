import { getWorldCup2026Teams } from "./worldCup2026Groups";

export interface WorldCupFixture {
    id: number;
    seasonId: number;
    groupName: string;
    matchNo: number;
    kickoffUtc: string;
    sourceTime: string;
    sourceTimezone: string;
    teamACode: string;
    teamBCode: string;
    teamAId: number;
    teamBId: number;
    scoreA: number | null;
    scoreB: number | null;
    status: "scheduled" | "locked" | "resolved";
}

export interface FixtureTeamLookup {
    id: number;
    code: string;
}

export const FIXTURE_SOURCE_TIMEZONE = "Asia/Ho_Chi_Minh";

const FIXTURE_DISPLAY_SETTINGS: Record<string, { locale: string; timeZone: string; label: string }> = {
    en: { locale: "en-US", timeZone: "America/New_York", label: "New York time" },
    vi: { locale: "vi-VN", timeZone: "Asia/Ho_Chi_Minh", label: "Giờ Việt Nam" },
    zh: { locale: "zh-CN", timeZone: "Asia/Shanghai", label: "北京时间" },
    ko: { locale: "ko-KR", timeZone: "Asia/Seoul", label: "한국 시간" },
    ja: { locale: "ja-JP", timeZone: "Asia/Tokyo", label: "日本時間" },
    ru: { locale: "ru-RU", timeZone: "Europe/Moscow", label: "Московское время" },
    id: { locale: "id-ID", timeZone: "Asia/Jakarta", label: "Waktu Jakarta" },
};

export const VIETNAMESE_TEAM_ALIASES: Record<string, string> = {
    "United States": "USA",
    "USA": "USA",
    "Canada": "CAN",
    "Mexico": "MEX",
    "South Africa": "RSA",
    "Nam Phi": "RSA",
    "South Korea": "KOR",
    "Hàn Quốc": "KOR",
    "Czechia": "CZE",
    "CH Séc": "CZE",
    "Bosnia & Herzegovina": "BIH",
    "Bosnia": "BIH",
    "Qatar": "QAT",
    "Switzerland": "SUI",
    "Thụy Sĩ": "SUI",
    "Brazil": "BRA",
    "Marocco": "MAR",
    "Morocco": "MAR",
    "Haiti": "HAI",
    "Scotland": "SCO",
    "Mỹ": "USA",
    "Paraguay": "PAR",
    "Australia": "AUS",
    "Úc": "AUS",
    "Turkey": "TUR",
    "Thổ Nhĩ Kỳ": "TUR",
    "Germany": "GER",
    "Đức": "GER",
    "Curacao": "CUW",
    "Ivory Coast": "CIV",
    "Bờ Biển Ngà": "CIV",
    "Ecuador": "ECU",
    "Netherlands": "NED",
    "Hà Lan": "NED",
    "Japan": "JPN",
    "Nhật Bản": "JPN",
    "Sweden": "SWE",
    "Thụy Điển": "SWE",
    "Tunisia": "TUN",
    "Belgium": "BEL",
    "Bỉ": "BEL",
    "Egypt": "EGY",
    "Ai Cập": "EGY",
    "Iran": "IRN",
    "New Zealand": "NZL",
    "Spain": "ESP",
    "Tây Ban Nha": "ESP",
    "Cabo Verde": "CPV",
    "Saudi Arabia": "KSA",
    "Uruguay": "URU",
    "France": "FRA",
    "Pháp": "FRA",
    "Senegal": "SEN",
    "Iraq": "IRQ",
    "Norway": "NOR",
    "Na Uy": "NOR",
    "Argentina": "ARG",
    "Algeria": "ALG",
    "Algérie": "ALG",
    "Austria": "AUT",
    "Áo": "AUT",
    "Jordan": "JOR",
    "Portugal": "POR",
    "Bồ Đào Nha": "POR",
    "DR Congo": "COD",
    "CHDC Congo": "COD",
    "Uzbekistan": "UZB",
    "Colombia": "COL",
    "England": "ENG",
    "Anh": "ENG",
    "Croatia": "CRO",
    "Ghana": "GHA",
    "Panama": "PAN",
};

const TEAM_GROUP_BY_CODE = new Map(getWorldCup2026Teams().map(team => [team.code, team.group]));

export function parseFixtureCsv(csv: string, seasonId = 1, teams: FixtureTeamLookup[] = getWorldCup2026Teams()): WorldCupFixture[] {
    const teamIdByCode = new Map(teams.map(team => [team.code, team.id]));
    const lines = csv.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    return lines.slice(1).map((line, index) => {
        const [rawGroup, rawTime, rawMatchNo, rawMatch] = line.split(",").map(part => part.trim());
        const [rawTeamA, rawTeamB] = rawMatch.split(/\s+vs\s+/i).map(part => part.trim());
        const teamACode = VIETNAMESE_TEAM_ALIASES[rawTeamA] || rawTeamA;
        const teamBCode = VIETNAMESE_TEAM_ALIASES[rawTeamB] || rawTeamB;
        const matchNo = Number((rawMatchNo.match(/\d+/) || [index + 1])[0]);
        const groupFromTeams = TEAM_GROUP_BY_CODE.get(teamACode) || TEAM_GROUP_BY_CODE.get(teamBCode);
        return {
            id: matchNo,
            seasonId,
            groupName: groupFromTeams || rawGroup.replace(/^Bảng\s+/i, "").replace(/^Group\s+/i, ""),
            matchNo,
            kickoffUtc: parseHanoiKickoff(rawTime).toISOString(),
            sourceTime: rawTime,
            sourceTimezone: FIXTURE_SOURCE_TIMEZONE,
            teamACode,
            teamBCode,
            teamAId: teamIdByCode.get(teamACode) ?? -1,
            teamBId: teamIdByCode.get(teamBCode) ?? -1,
            scoreA: null,
            scoreB: null,
            status: "scheduled",
        };
    });
}

export function parseHanoiKickoff(value: string, year = 2026): Date {
    const match = value.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return new Date(Date.UTC(year, 0, 1));
    const [, day, month, hour, minute] = match;
    return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+07:00`);
}

export function getFixtureDisplaySettings(lang: string) {
    return FIXTURE_DISPLAY_SETTINGS[lang] || FIXTURE_DISPLAY_SETTINGS.en;
}

export function formatFixtureKickoff(kickoffUtc: string, lang: string, timeZone?: string) {
    const settings = getFixtureDisplaySettings(lang);
    return new Intl.DateTimeFormat(settings.locale, {
        timeZone: timeZone || settings.timeZone,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "shortOffset",
    }).format(new Date(kickoffUtc));
}

export function formatFixtureKickoffParts(kickoffUtc: string, lang: string) {
    const settings = getFixtureDisplaySettings(lang);
    const date = new Date(kickoffUtc);
    return {
        weekday: new Intl.DateTimeFormat(settings.locale, { timeZone: settings.timeZone, weekday: "short" }).format(date),
        date: new Intl.DateTimeFormat(settings.locale, { timeZone: settings.timeZone, day: "2-digit", month: "short", year: "numeric" }).format(date),
        time: new Intl.DateTimeFormat(settings.locale, { timeZone: settings.timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date),
        timeZone: settings.timeZone,
        label: settings.label,
    };
}
