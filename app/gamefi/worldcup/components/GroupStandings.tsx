"use client";

import React, { useMemo } from "react";
import TeamCrest from "./TeamCrest";

export interface StandingTeam {
    id: number;
    name: string;
    code: string;
    group: string;
    color: string;
    colorSecondary: string;
    status?: string;
}

export interface StandingMatch {
    id: number;
    teamA: number;
    teamB: number;
    round: string;
    time: string;
    elimination: boolean;
}

export interface MatchScore {
    home: string;
    away: string;
}

interface StandingRow {
    team: StandingTeam;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
}

interface GroupStandingsProps {
    teams: StandingTeam[];
    matches?: StandingMatch[];
    scores?: Record<number, MatchScore>;
    editable?: boolean;
    labels: {
        standings: string;
        team: string;
        playedShort: string;
        winsShort: string;
        drawsShort: string;
        lossesShort: string;
        goalsForShort: string;
        goalsAgainstShort: string;
        goalDiffShort: string;
        pointsShort: string;
        score: string;
        noScheduled: string;
        eliminated?: string;
    };
    onScoreChange?: (matchId: number, score: MatchScore) => void;
}

function emptyRow(team: StandingTeam): StandingRow {
    return {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
    };
}

function scoreNumber(value: string) {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
}

export default function GroupStandings({ teams, matches = [], scores = {}, editable = false, labels, onScoreChange }: GroupStandingsProps) {
    const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
    const groups = useMemo(() => {
        const grouped = new Map<string, StandingTeam[]>();
        teams.forEach(team => {
            const group = team.group || "-";
            grouped.set(group, [...(grouped.get(group) || []), team]);
        });
        return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [teams]);

    const standings = useMemo(() => {
        const rows = new Map<number, StandingRow>();
        teams.forEach(team => rows.set(team.id, emptyRow(team)));

        matches.forEach(match => {
            const home = scoreNumber(scores[match.id]?.home ?? "");
            const away = scoreNumber(scores[match.id]?.away ?? "");
            if (home === null || away === null) return;
            const rowA = rows.get(match.teamA);
            const rowB = rows.get(match.teamB);
            if (!rowA || !rowB) return;

            rowA.played += 1;
            rowB.played += 1;
            rowA.goalsFor += home;
            rowA.goalsAgainst += away;
            rowB.goalsFor += away;
            rowB.goalsAgainst += home;

            if (home > away) {
                rowA.wins += 1;
                rowA.points += 3;
                rowB.losses += 1;
            } else if (away > home) {
                rowB.wins += 1;
                rowB.points += 3;
                rowA.losses += 1;
            } else {
                rowA.draws += 1;
                rowB.draws += 1;
                rowA.points += 1;
                rowB.points += 1;
            }
        });

        rows.forEach(row => {
            row.goalDiff = row.goalsFor - row.goalsAgainst;
        });
        return rows;
    }, [matches, scores, teams]);

    const matchesByGroup = useMemo(() => {
        const grouped = new Map<string, StandingMatch[]>();
        matches.forEach(match => {
            const group = teamsById.get(match.teamA)?.group || teamsById.get(match.teamB)?.group || "-";
            grouped.set(group, [...(grouped.get(group) || []), match]);
        });
        return grouped;
    }, [matches, teamsById]);

    return (
        <div className="wc-group-standings">
            {groups.map(([group, groupTeams]) => {
                const orderedRows = groupTeams
                    .map(team => standings.get(team.id) || emptyRow(team))
                    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.id - b.team.id);
                const groupMatches = matchesByGroup.get(group) || [];

                return (
                    <section key={group} className="wc-group-card">
                        <div className="wc-group-card-head">
                            <h3>{labels.standings} {group}</h3>
                            <span>{groupTeams.length} {labels.team.toLowerCase()}</span>
                        </div>
                        <div className="wc-ladder-list">
                            {orderedRows.map((row, index) => {
                                const eliminated = row.team.status === "eliminated";
                                return (
                                    <div
                                        key={row.team.id}
                                        className={`wc-ladder-row ${eliminated ? "is-eliminated" : ""} ${index < 2 ? "is-leading" : ""}`}
                                        style={{ "--team-color": row.team.color } as React.CSSProperties}
                                    >
                                        <span className="wc-ladder-rank">{index + 1}</span>
                                        <TeamCrest code={row.team.code} name={row.team.name} color={row.team.color} colorSecondary={row.team.colorSecondary} size="sm" />
                                        <div className="wc-ladder-team">
                                            <strong>{row.team.name}</strong>
                                            <small>{row.team.code}</small>
                                        </div>
                                        <div className="wc-ladder-points">
                                            <strong>{row.points}</strong>
                                            <span>{labels.pointsShort}</span>
                                        </div>
                                        {eliminated && <span className="wc-ladder-eliminated">{labels.eliminated || "Eliminated"}</span>}
                                    </div>
                                );
                            })}
                        </div>
                        {editable && (
                            <div className="wc-group-score-list">
                                {groupMatches.length === 0 ? (
                                    <span>{labels.noScheduled}</span>
                                ) : groupMatches.map(match => {
                                    const teamA = teamsById.get(match.teamA);
                                    const teamB = teamsById.get(match.teamB);
                                    const score = scores[match.id] || { home: "", away: "" };
                                    return (
                                        <div key={match.id} className="wc-group-score-row">
                                            <span>{match.round}</span>
                                            <strong>{teamA?.code || match.teamA}</strong>
                                            <input
                                                aria-label={`${teamA?.name || match.teamA} ${labels.score}`}
                                                type="number"
                                                min={0}
                                                value={score.home}
                                                onChange={event => onScoreChange?.(match.id, { ...score, home: event.target.value })}
                                            />
                                            <em>-</em>
                                            <input
                                                aria-label={`${teamB?.name || match.teamB} ${labels.score}`}
                                                type="number"
                                                min={0}
                                                value={score.away}
                                                onChange={event => onScoreChange?.(match.id, { ...score, away: event.target.value })}
                                            />
                                            <strong>{teamB?.code || match.teamB}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
