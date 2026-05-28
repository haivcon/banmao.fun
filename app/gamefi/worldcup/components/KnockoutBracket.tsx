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
    onTeamClick?: (teamId: number) => void;
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

export default function KnockoutBracket({ state, teams, editable = false, saving = false, onChange, onSave, onSeed, onUseMatch, onTeamClick, labels }: KnockoutBracketProps) {
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
        const isClickable = !editable && team && onTeamClick;

        return (
            <div 
                className={`wc-bracket-slot ${isWinner ? "is-winner" : ""} ${eliminated ? "is-eliminated" : ""} ${isClickable ? "is-clickable" : ""}`}
                onClick={() => isClickable && team ? onTeamClick(team.id) : undefined}
            >
                {editable ? (
                    <SelectMenu value={slot.teamId === null ? "" : String(slot.teamId)} options={teamOptions} onChange={value => setSlotTeam(roundIndex, matchIndex, side, value)} className="wc-bracket-select" />
                ) : (
                    <>
                        {team ? (
                            <TeamCrest code={team.code} name={team.name} color={team.color} colorSecondary={team.colorSecondary} size="sm" />
                        ) : <span className="wc-bracket-placeholder-dot" />}
                        <strong title={team?.name}>{team?.code || slot.label}</strong>
                    </>
                )}
                {team && eliminated && <span className="wc-bracket-eliminated" title={labels.eliminated}>✕</span>}
            </div>
        );
    };

    const renderConnectors = (matchCount: number, side: 'left' | 'right') => {
        if (matchCount === 0) return null;
        const connectors = [];
        if (matchCount === 1) {
            connectors.push(
                <div key="conn-0" className={`wc-bracket-connector straight ${side}`} style={{ top: '50%' }} />
            );
            return connectors;
        }
        const pairCount = Math.floor(matchCount / 2);
        for (let j = 0; j < pairCount; j++) {
            const top = ((2 * j + 0.5) / matchCount) * 100;
            const height = (1 / matchCount) * 100;
            connectors.push(
                <div key={`conn-${j}`} className={`wc-bracket-connector ${side}`} style={{ top: `${top}%`, height: `${height}%` }} />
            );
        }
        return connectors;
    };

    const renderRoundMatchesList = (roundIndex: number, side?: 'left' | 'right') => {
        const round = state.rounds[roundIndex];
        let matchesToRender = round.matches.map((m, i) => ({ match: m, originalIndex: i }));
        
        if (side && roundIndex !== state.rounds.length - 1) {
            const half = Math.ceil(round.matches.length / 2);
            if (side === 'left') {
                matchesToRender = matchesToRender.slice(0, half);
            } else {
                matchesToRender = matchesToRender.slice(half);
            }
        }

        return (
            <div className="wc-bracket-round-matches">
                {side && roundIndex !== state.rounds.length - 1 && renderConnectors(matchesToRender.length, side)}
                {matchesToRender.map(({ match, originalIndex }) => {
                    const teamA = match.teamA.teamId !== null ? teamsById.get(match.teamA.teamId) : undefined;
                    const teamB = match.teamB.teamId !== null ? teamsById.get(match.teamB.teamId) : undefined;
                    return (
                        <article key={match.id} className="wc-bracket-match">
                            {renderSlot(match, roundIndex, originalIndex, "teamA")}
                            <div className="wc-bracket-match-mid">
                                {editable ? (
                                    <>
                                        <input aria-label={`${match.id} A ${labels.score}`} value={match.scoreA} onChange={event => setScore(roundIndex, originalIndex, "scoreA", event.target.value)} />
                                        <span>-</span>
                                        <input aria-label={`${match.id} B ${labels.score}`} value={match.scoreB} onChange={event => setScore(roundIndex, originalIndex, "scoreB", event.target.value)} />
                                    </>
                                ) : (
                                    <strong>{match.scoreA || "-"} : {match.scoreB || "-"}</strong>
                                )}
                            </div>
                            {renderSlot(match, roundIndex, originalIndex, "teamB")}
                            {editable && (
                                <div className="wc-bracket-actions">
                                    <button type="button" disabled={!teamA} onClick={() => setWinner(roundIndex, originalIndex, teamA?.id ?? null)}>{teamA?.code || "A"} {labels.winner}</button>
                                    <button type="button" disabled={!teamB} onClick={() => setWinner(roundIndex, originalIndex, teamB?.id ?? null)}>{teamB?.code || "B"} {labels.winner}</button>
                                    {onUseMatch && <button type="button" disabled={!teamA || !teamB} onClick={() => onUseMatch(match)}>{labels.useMatch}</button>}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        );
    };

    const isDoubleSided = state.rounds.length > 1;
    const finalRoundIndex = state.rounds.length - 1;
    const finalRound = state.rounds[finalRoundIndex];

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

            <div className={`wc-bracket-board ${isDoubleSided ? 'double-sided' : ''}`}>
                {isDoubleSided ? (
                    <>
                        <div className="wc-bracket-side left-side">
                            {state.rounds.slice(0, finalRoundIndex).map((round, roundIndex) => (
                                <div key={`left-${round.id}`} className="wc-bracket-round">
                                    <h3>{round.title}</h3>
                                    {renderRoundMatchesList(roundIndex, 'left')}
                                </div>
                            ))}
                        </div>
                        
                        <div className="wc-bracket-center">
                            <div className="wc-bracket-round">
                                <h3>{finalRound.title}</h3>
                                {renderRoundMatchesList(finalRoundIndex)}
                            </div>
                        </div>

                        <div className="wc-bracket-side right-side">
                            {state.rounds.slice(0, finalRoundIndex).reverse().map((round, reverseIndex) => {
                                const roundIndex = finalRoundIndex - 1 - reverseIndex;
                                return (
                                    <div key={`right-${round.id}`} className="wc-bracket-round">
                                        <h3>{round.title}</h3>
                                        {renderRoundMatchesList(roundIndex, 'right')}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    state.rounds.map((round, roundIndex) => (
                        <div key={round.id} className="wc-bracket-round">
                            <h3>{round.title}</h3>
                            {renderRoundMatchesList(roundIndex)}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
