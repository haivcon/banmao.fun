/**
 * History lookup formatting utilities
 */

import { LocaleStrings } from "./i18n";
import { HistoryLookupRaw } from "./types";
import { HistoryLookupResult } from "../components/FloatingSettings";
import {
    STATE, ZERO_ADDR, formatTokenAmount, roomIsFinalized, deriveFinalOutcome, getCancelDetails
} from "./gameUtils";

/**
 * Format raw room data into a history lookup result for display
 */
export function formatHistoryLookup(
    raw: HistoryLookupRaw,
    t: LocaleStrings,
    decimals: number
): HistoryLookupResult {
    const hasOpponent = raw.opponent !== ZERO_ADDR;
    const shortCreator = `${raw.creator.slice(0, 6)}...${raw.creator.slice(-4)}`;
    const shortOpponent = hasOpponent
        ? `${raw.opponent.slice(0, 6)}...${raw.opponent.slice(-4)}`
        : t.historyLookupOpponentPending;
    const stateLabel = STATE[raw.state] ?? String(raw.state);

    const baseRoom = {
        state: raw.state,
        commitA: raw.commitA,
        commitB: raw.commitB,
        revealA: raw.revealA,
        revealB: raw.revealB,
        creator: raw.creator,
        opponent: raw.opponent,
        forfeit: raw.forfeit,
    };

    let resultSummary: string;
    let note: string | undefined;

    if (roomIsFinalized(baseRoom)) {
        const outcome = deriveFinalOutcome(baseRoom);
        let viaLabel: string = t.historyLookupViaUnknown;
        if (outcome.via === "normal") viaLabel = t.historyLookupViaReveal;
        else if (outcome.via === "commit-timeout") viaLabel = t.historyLookupViaCommitTimeout;
        else if (outcome.via === "reveal-timeout") viaLabel = t.historyLookupViaRevealTimeout;
        else if (outcome.via === "both-commit-timeout") viaLabel = t.historyLookupViaBothCommit;
        else if (outcome.via === "both-reveal-timeout") viaLabel = t.historyLookupViaBothReveal;
        else if (outcome.via === "forfeit") viaLabel = t.historyLookupViaForfeit ?? t.historyLookupViaUnknown;

        if (outcome.winner === "creator") {
            resultSummary = t.historyLookupResultSummary(t.creator, viaLabel);
        } else if (outcome.winner === "opponent") {
            resultSummary = t.historyLookupResultSummary(t.opponent, viaLabel);
        } else if (outcome.via === "forfeit") {
            resultSummary = t.historyLookupResultForfeit
                ? t.historyLookupResultForfeit(viaLabel)
                : t.historyLookupResultDraw(viaLabel);
        } else {
            resultSummary = t.historyLookupResultDraw(viaLabel);
        }

        if (outcome.via === "forfeit" && t.historyLookupNoteForfeit) {
            note = t.historyLookupNoteForfeit("90%", "5%", "5%");
        }
    } else if (raw.state === 4) {
        const details = getCancelDetails({ ...baseRoom, opponent: raw.opponent }, t);
        resultSummary = t.historyLookupCanceledSummary(details.reason);
        note = t.historyLookupNoteRefund(details.refund);
    } else if (!hasOpponent) {
        resultSummary = t.historyLookupNoOpponent;
    } else {
        resultSummary = t.historyLookupPending(stateLabel);
    }

    return {
        id: raw.id,
        creator: shortCreator,
        creatorFull: raw.creator,
        opponent: hasOpponent ? shortOpponent : t.historyLookupOpponentPending,
        opponentFull: raw.opponent,
        stakeFormatted: `${formatTokenAmount(raw.stake, decimals)} $BANMAO`,
        stateLabel,
        resultSummary,
        note,
        hasOpponent,
    };
}
