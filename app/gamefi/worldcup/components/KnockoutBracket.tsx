"use client";

import React from "react";
import TeamCrest from "./TeamCrest";
import SelectMenu from "./SelectMenu";
import { advanceBracketWinner, type BracketMatch, type BracketState } from "../lib/worldCup2026Bracket";

interface TeamOption {
    id: number;
    name: string;
    code: string;
    color: string;
    colorSecondary: string;
    status?: string;
}

interface KnockoutBracketProps {
    state: BracketState;
    teams: TeamOption[];
    editable?: boolean;
    saving?: boolean;
    onChange?: (state: BracketState) => void;
    onSave?: () => void;
    onSeed?: () => void;
    onUseMatch?: (match: BracketMatch) => void;
    labels: {
        knockoutBracket: string;
        knockoutBracketDesc: string;
        saveBracket: string;
        seedBracket: string;
        useMatch: string;
        winner: string;
        score: string;
        eliminated: string;
        emptySlot: string;
    };
}

function cloneState(state: BracketState): BracketState {
    return structuredClone(state) as BracketState;
}

export default function KnockoutBracket({ state, teams, editable = false, saving = false, onChange, onSave, onSeed, onUseMatch, labels }: KnockoutBracketProps) {
    const teamsById = React.useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
    const teamOptions = React.useMemo(() => [
        { value: "", label: labels.emptySlot },
        ...teams.map(team => ({ value: String(team.id), label: `${team.code} - ${team.name}`, description: team.status || "" })),
    ], [labels.emptySlot, teams]);

    const setSlotTeam = (roundIndex: number, matchIndex: number, side: "teamA" | "teamB", value: string) => {
        const next = cloneState(state);
        const slot = next.rounds[roundIndex].matches[matchIndex][side];
        slot.teamId = value === "" ? null : Number(value);
        if (value !== "") {
            const team = teamsById.get(Number(value));
            if (team) slot.label = team.code;
        }
        next.rounds[roundIndex].matches[matchIndex].winnerId = null;
        onChange?.(next);
    };

    const setScore = (roundIndex: number, matchIndex: number, side: "scoreA" | "scoreB", value: string) => {
        const next = cloneState(state);
        next.rounds[roundIndex].matches[matchIndex][side] = value;
        onChange?.(next);
    };

    const setWinner = (roundIndex: number, matchIndex: number, winnerId: number | null) => {
        onChange?.(advanceBracketWinner(state, roundIndex, matchIndex, winnerId));
    };

    const renderSlot = (match: BracketMatch, roundIndex: number, matchIndex: number, side: "teamA" | "teamB") => {
        const slot = match[side];
        const team = slot.teamId !== null ? teamsById.get(slot.teamId) : undefined;
        const isWinner = team && match.winnerId === team.id;
        const eliminated = team && match.winnerId !== null && match.winnerId !== team.id;

        return (
            <div className={`wc-bracket-slot ${isWinner ? "is-winner" : ""} ${eliminated ? "is-eliminated" : ""}`}>
                {editable ? (
                    <SelectMenu value={slot.teamId === null ? "" : String(slot.teamId)} options={teamOptions} onChange={value => setSlotTeam(roundIndex, matchIndex, side, value)} className="wc-bracket-select" />
                ) : (
                    <>
                        {team ? (
                            <TeamCrest code={team.code} name={team.name} color={team.color} colorSecondary={team.colorSecondary} size="sm" />
                        ) : <span className="wc-bracket-placeholder-dot" />}
                        <strong>{team?.name || slot.label}</strong>
                    </>
                )}
                {team && eliminated && <span className="wc-bracket-eliminated">{labels.eliminated}</span>}
            </div>
        );
    };

    return (
        <section className="wc-knockout-section">
            <div className="wc-section-head">
                <div>
                    <span className="wc-eyebrow">World Cup 2026</span>
                    <h2>{labels.knockoutBracket}</h2>
                    <p>{labels.knockoutBracketDesc}</p>
                </div>
                {editable && (
                    <div className="wc-bracket-head-actions">
                        {onSeed && <button type="button" className="wc-bracket-save is-secondary" onClick={onSeed} disabled={saving}>{labels.seedBracket}</button>}
                        <button type="button" className="wc-bracket-save" onClick={onSave} disabled={saving}>{saving ? "..." : labels.saveBracket}</button>
                    </div>
                )}
            </div>

            <div className="wc-bracket-board">
                {state.rounds.map((round, roundIndex) => (
                    <div key={round.id} className="wc-bracket-round">
                        <h3>{round.title}</h3>
                        <div className="wc-bracket-round-matches">
                            {round.matches.map((match, matchIndex) => {
                                const teamA = match.teamA.teamId !== null ? teamsById.get(match.teamA.teamId) : undefined;
                                const teamB = match.teamB.teamId !== null ? teamsById.get(match.teamB.teamId) : undefined;
                                return (
                                    <article key={match.id} className="wc-bracket-match">
                                        {renderSlot(match, roundIndex, matchIndex, "teamA")}
                                        <div className="wc-bracket-match-mid">
                                            {editable ? (
                                                <>
                                                    <input aria-label={`${match.id} A ${labels.score}`} value={match.scoreA} onChange={event => setScore(roundIndex, matchIndex, "scoreA", event.target.value)} />
                                                    <span>-</span>
                                                    <input aria-label={`${match.id} B ${labels.score}`} value={match.scoreB} onChange={event => setScore(roundIndex, matchIndex, "scoreB", event.target.value)} />
                                                </>
                                            ) : (
                                                <strong>{match.scoreA || "-"} : {match.scoreB || "-"}</strong>
                                            )}
                                        </div>
                                        {renderSlot(match, roundIndex, matchIndex, "teamB")}
                                        {editable && (
                                            <div className="wc-bracket-actions">
                                                <button type="button" disabled={!teamA} onClick={() => setWinner(roundIndex, matchIndex, teamA?.id ?? null)}>{teamA?.code || "A"} {labels.winner}</button>
                                                <button type="button" disabled={!teamB} onClick={() => setWinner(roundIndex, matchIndex, teamB?.id ?? null)}>{teamB?.code || "B"} {labels.winner}</button>
                                                {onUseMatch && <button type="button" disabled={!teamA || !teamB} onClick={() => onUseMatch(match)}>{labels.useMatch}</button>}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
