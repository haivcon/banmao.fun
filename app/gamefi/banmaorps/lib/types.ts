import { LocaleStrings } from "./i18n";

export type Choice = 1 | 2 | 3;

export interface LastCommitInfo {
    roomId: string;
    stakeHuman: string;
    choice: Choice;
    salt: `0x${string}`;
}

export type CommitInfoMap = Record<string, LastCommitInfo>;

export type Html2CanvasFn = (
    element: HTMLElement | Document,
    options?: any
) => Promise<HTMLCanvasElement>;

export type ForfeitRecord = {
    loser?: `0x${string}` | null;
    winner?: `0x${string}` | null;
    payout?: bigint | null;
};

export type MinimalPublicClient = {
    getBlockNumber: () => Promise<bigint>;
    getLogs: (args: any) => Promise<any[]>;
};

export type VibrateOptions = {
    force?: boolean;
    allowDuringCooldown?: boolean;
};

export type RoomSnapshot = {
    id: number;
    creator: `0x${string}`;
    opponent: `0x${string}`;
    stake: bigint;
    commitA: `0x${string}`;
    commitB: `0x${string}`;
    revealA: number;
    revealB: number;
    state: number;
    commitDeadline: number;
    revealDeadline: number;
};

export type RoomWithForfeit = RoomSnapshot & { forfeit?: ForfeitRecord | null };

export type UserStatsShape = {
    win: number;
    loss: number;
    draw: number;
    totalWinnings: bigint;
    totalLosses: bigint;
    rock: number;
    paper: number;
    scissors: number;
};

export type CachedInfoState = {
    balance: bigint | null;
    stats: UserStatsShape;
};

export type CachedRoomEntry = {
    id: number;
    creator: `0x${string}`;
    opponent: `0x${string}`;
    stake: string;
    commitA: `0x${string}`;
    commitB: `0x${string}`;
    revealA: number;
    revealB: number;
    state: number;
    commitDeadline: number;
    revealDeadline: number;
    forfeit?: {
        loser?: `0x${string}` | null;
        winner?: `0x${string}` | null;
        payout?: string | null;
    } | null;
};

export type InfoTableProps = {
    balance: bigint | null | undefined;
    decimals: number;
    stats: UserStatsShape;
    strings: LocaleStrings;
};

export type InfoRow = {
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    detail?: string | null;
};

export type TelegramReminderMeta = {
    key: string;
    roomId: number;
    type: "commit" | "commit-urgent" | "reveal";
    title: string;
    body: string;
    deadline?: number | null;
};

export type HistoryLookupRaw = {
    id: number;
    creator: `0x${string}`;
    opponent: `0x${string}`;
    stake: bigint;
    state: number;
    commitA: `0x${string}`;
    commitB: `0x${string}`;
    revealA: number;
    revealB: number;
    forfeit?: ForfeitRecord | null;
};

export type FinalOutcomeVia =
    | "normal"
    | "commit-timeout"
    | "reveal-timeout"
    | "both-commit-timeout"
    | "both-reveal-timeout"
    | "forfeit"
    | "unknown";

export type FinalOutcome = {
    winner: "creator" | "opponent" | "draw" | null;
    via: FinalOutcomeVia;
};

export type ForfeitResolution = {
    winnerSide: "creator" | "opponent" | null;
    loserSide: "creator" | "opponent" | null;
    winnerAddress: string | null;
    loserAddress: string | null;
};

export type PersonalSummaryAccent =
    | "idle"
    | "urgent"
    | "claim"
    | "finished"
    | "finished-win"
    | "finished-lose"
    | "finished-draw";

export type PersonalSummaryActionType =
    | "commit"
    | "reveal"
    | "claim"
    | "share"
    | "dismiss"
    | "forfeit";

export type PersonalSummary = {
    id: number;
    opponent: string | null;
    opponentDisplay: string;
    status: string;
    state: number;
    accent: PersonalSummaryAccent;
    actionLabel?: string;
    onAction?: () => void;
    actionType?: PersonalSummaryActionType;
    needsAction: boolean;
    detail?: string;
    showChoicePicker?: boolean;
    savedChoice?: string | null;
    saltHex?: `0x${string}` | null;
    phase?: string;
    timeLeft?: string | null;
    stakeText?: string;
    choice?: { label: string; img: string } | null;
    allowForfeit?: boolean;
    onForfeit?: () => void;
    alertKey?: string;
};
