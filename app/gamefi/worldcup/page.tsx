"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { formatEther } from "viem";
import "./worldcup.css";
import { useWorldCup } from "./hooks/useWorldCup";
import TeamCard from "./components/TeamCard";
import StakeModal from "./components/StakeModal";
import StatsBar from "./components/StatsBar";
import UserPortfolio from "./components/UserPortfolio";
import OkxInsights from "./components/OkxInsights";
import SelectMenu from "./components/SelectMenu";
import SoundToggle from "./components/SoundToggle";
import GroupStandings, { type MatchScore, type StandingMatch } from "./components/GroupStandings";
import KnockoutBracket from "./components/KnockoutBracket";
import { createDefaultWorldCup2026Bracket, hasSeededTeams, seedBracketWithTeams, type BracketState } from "./lib/worldCup2026Bracket";
import { formatFixtureKickoff, formatFixtureKickoffParts, getFixtureDisplaySettings, type WorldCupFixture } from "./lib/worldCup2026Fixtures";
import { useSoundFX } from "./hooks/SoundContext";
import { WC_LANGS, useWCLang, type WCLang } from "./lib/i18n";
import { WORLDCUP_CONTRACT_ADDRESS, XLAYER_EXPLORER_BASE_URL } from "./contracts";
import TeamCrest from "./components/TeamCrest";
import WorldCupLogo from "./components/WorldCupLogo";
import { cleanLabel } from "./lib/labels";
import { useSeasonBranding } from "./lib/seasonBranding";
import { Award, ChartColumn, CheckCircle2, CircleDot, Coins, Compass, Filter, Gamepad2, Globe2, Grid3X3, History, LayoutGrid, List, LockKeyhole, Search, Settings, ShieldAlert, Sparkles, Trophy, Timer, WalletCards, AlertTriangle } from "lucide-react";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function WorldCupPage() {
    const wc = useWorldCup();
    const { playTick, playPop } = useSoundFX();
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [view, setView] = useState<'grid' | 'leaderboard' | 'recommended' | 'fixtures' | 'groups' | 'bracket'>('grid');
    const [scheduledMatches, setScheduledMatches] = useState<StandingMatch[]>([]);
    const [matchScores, setMatchScores] = useState<Record<number, MatchScore>>({});
    const [fixtures, setFixtures] = useState<WorldCupFixture[]>([]);
    const [bracketState, setBracketState] = useState<BracketState>(() => createDefaultWorldCup2026Bracket(1));
    const [teamSearch, setTeamSearch] = useState('');
    const [teamSort, setTeamSort] = useState<'group' | 'name' | 'principal' | 'weight' | 'userStake' | 'pending'>('group');
    const [teamFilter, setTeamFilter] = useState<'all' | 'active' | 'my' | 'rewards' | 'locked' | 'eliminated'>('all');
    const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact' | 'list'>('comfortable');
    const [leaderboardMetric, setLeaderboardMetric] = useState<'principal' | 'weight'>('principal');
    const { lang, setLang, t } = useWCLang();
    const [showLangPicker, setShowLangPicker] = useState(false);
    const branding = useSeasonBranding();

    useEffect(() => {
        try {
            const rawSchedule = localStorage.getItem("wc_admin_schedule");
            const rawScores = localStorage.getItem("wc_admin_group_scores");
            if (rawSchedule) setScheduledMatches(JSON.parse(rawSchedule));
            if (rawScores) setMatchScores(JSON.parse(rawScores));
        } catch {}
    }, []);

    useEffect(() => {
        if (wc.teamPools.length === 0) return;
        let cancelled = false;
        fetch(`/api/worldcup/fixtures?seasonId=${wc.selectedSeasonId || 1}`)
            .then(res => res.json())
            .then(data => {
                if (cancelled || !Array.isArray(data?.fixtures)) return;
                const items = data.fixtures as WorldCupFixture[];
                const idByCode = new Map(wc.teamPools.map(team => [team.code, team.id]));
                setFixtures(items);
                setScheduledMatches(items.map(item => ({
                    id: item.matchNo,
                    teamA: idByCode.get(item.teamACode) ?? item.teamAId,
                    teamB: idByCode.get(item.teamBCode) ?? item.teamBId,
                    round: `${t.group} ${item.groupName} · Match ${item.matchNo}`,
                    time: formatFixtureKickoff(item.kickoffUtc, lang),
                    elimination: false,
                })).filter(item => item.teamA >= 0 && item.teamB >= 0));
                setMatchScores(Object.fromEntries(items
                    .filter(item => item.scoreA !== null && item.scoreB !== null)
                    .map(item => [item.matchNo, { home: String(item.scoreA), away: String(item.scoreB) }])
                ));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [lang, t.group, wc.selectedSeasonId, wc.teamPools]);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/worldcup/bracket?seasonId=${wc.selectedSeasonId || 1}`)
            .then(res => res.json())
            .then(data => {
                if (!cancelled && data?.state) setBracketState(data.state);
            })
            .catch(() => {
                if (!cancelled) setBracketState(createDefaultWorldCup2026Bracket(wc.selectedSeasonId || 1));
            });
        return () => { cancelled = true; };
    }, [wc.selectedSeasonId]);

    useEffect(() => {
        if (wc.teamPools.length === 0 || hasSeededTeams(bracketState)) return;
        setBracketState(current => seedBracketWithTeams(current, wc.teamPools));
    }, [bracketState, wc.teamPools]);

    const changeLang = (l: WCLang) => { setLang(l); setShowLangPicker(false); };
    const currentLang = WC_LANGS.find(l => l.code === lang);

    const selectedTeam = selectedTeamId !== null ? wc.teamPools.find(tp => tp.id === selectedTeamId) : null;
    const emptyUserStake = useMemo(() => ({ amount: BigInt(0), principal: BigInt(0), weight: BigInt(0), pendingRewards: BigInt(0) }), []);
    const selectedUserStake = selectedTeamId !== null ? (wc.userStakes[selectedTeamId] || emptyUserStake) : emptyUserStake;
    const activeTeams = wc.teamPools.filter(tp => tp.status === 'active' || tp.status === 'locked').length;
    const playerPositions = wc.teamPools.map((team, id) => ({
        team,
        stake: wc.userStakes[id] || emptyUserStake,
    })).filter(item => item.stake.amount > BigInt(0) || item.stake.pendingRewards > BigInt(0));
    const totalUserStake = playerPositions.reduce((sum, item) => sum + item.stake.amount, BigInt(0));
    const totalPendingRewards = playerPositions.reduce((sum, item) => sum + item.stake.pendingRewards, BigInt(0));
    const hasAnyPosition = playerPositions.length > 0;
    const visibleTeams = useMemo(() => {
        const query = teamSearch.trim().toLowerCase();
        const filtered = wc.teamPools.filter(team => {
            if (!query) return true;
            return `${team.name} ${team.code} ${team.group}`.toLowerCase().includes(query);
        }).filter(team => {
            const stake = wc.userStakes[team.id] || { amount: BigInt(0), pendingRewards: BigInt(0) };
            if (teamFilter === 'active') return team.status === 'active';
            if (teamFilter === 'my') return stake.amount > BigInt(0);
            if (teamFilter === 'rewards') return stake.pendingRewards > BigInt(0);
            if (teamFilter === 'locked') return team.status === 'locked';
            if (teamFilter === 'eliminated') return team.status === 'eliminated';
            return true;
        });
        return [...filtered].sort((a, b) => {
            if (teamSort === 'name') return a.name.localeCompare(b.name);
            if (teamSort === 'principal') return Number(b.totalPrincipal - a.totalPrincipal) || a.id - b.id;
            if (teamSort === 'weight') return Number(b.totalWeight - a.totalWeight) || a.id - b.id;
            if (teamSort === 'userStake') return Number((wc.userStakes[b.id]?.amount || BigInt(0)) - (wc.userStakes[a.id]?.amount || BigInt(0))) || a.id - b.id;
            if (teamSort === 'pending') return Number((wc.userStakes[b.id]?.pendingRewards || BigInt(0)) - (wc.userStakes[a.id]?.pendingRewards || BigInt(0))) || a.id - b.id;
            return a.group.localeCompare(b.group) || a.id - b.id;
        });
    }, [teamSearch, teamSort, teamFilter, wc.teamPools, wc.userStakes]);
    const leaderboard = useMemo(() => [...visibleTeams].sort((a, b) => {
        const av = leaderboardMetric === 'principal' ? a.totalPrincipal : a.totalWeight;
        const bv = leaderboardMetric === 'principal' ? b.totalPrincipal : b.totalWeight;
        return Number(bv - av) || a.id - b.id;
    }), [visibleTeams, leaderboardMetric]);
    const topTeams = leaderboard.slice(0, 2);
    const isContractConfigured = WORLDCUP_CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
    const explorerAddressUrl = `${XLAYER_EXPLORER_BASE_URL.replace(/\/$/, '')}/address/${WORLDCUP_CONTRACT_ADDRESS}`;
    const tournamentStatus = cleanLabel(wc.tournamentEnded ? t.finished : wc.tournamentStarted ? t.live : t.pending);
    const totalStakedAll = wc.totalStakedAll || BigInt(0);
    const topOneShare = totalStakedAll > BigInt(0) && topTeams[0] ? Number((topTeams[0].totalStaked * BigInt(10000)) / totalStakedAll) / 100 : 50;
    const topTwoShare = totalStakedAll > BigInt(0) && topTeams[1] ? Number((topTeams[1].totalStaked * BigInt(10000)) / totalStakedAll) / 100 : 50;
    const latestMatch = wc.latestMatch;
    const latestTeamA = latestMatch ? wc.teamPools[latestMatch.teamA] : undefined;
    const latestTeamB = latestMatch ? wc.teamPools[latestMatch.teamB] : undefined;
    const latestWinner = latestMatch?.isResolved && !latestMatch.isDraw ? wc.teamPools[latestMatch.winningTeam] : undefined;
    const latestLoser = latestMatch?.isResolved && !latestMatch.isDraw
        ? wc.teamPools[latestMatch.winningTeam === latestMatch.teamA ? latestMatch.teamB : latestMatch.teamA]
        : undefined;
    const claimableRewards = wc.userStakes.reduce((sum, stake) => sum + (stake.pendingRewards || BigInt(0)), BigInt(0));
    const claimableTeamId = wc.userStakes.findIndex(stake => (stake.pendingRewards || BigInt(0)) > BigInt(0));
    const latestUserReward = latestWinner ? (wc.userStakes[latestWinner.id]?.pendingRewards || BigInt(0)) : BigInt(0);
    const latestBreakdown = wc.latestMatchBreakdown;
    const latestSlashedAmount = latestBreakdown?.slashedAmount ?? latestMatch?.slashedAmount ?? BigInt(0);
    const latestFeeBonus = latestBreakdown?.feeBonus ?? BigInt(0);
    const latestTotalReward = latestBreakdown?.totalReward ?? latestSlashedAmount + latestFeeBonus;
    const latestWinningWeight = latestBreakdown?.winningPoolWeight ?? latestWinner?.totalWeight ?? BigInt(0);
    const latestUserWeight = latestWinner ? (wc.userStakes[latestWinner.id]?.weight || BigInt(0)) : BigInt(0);
    const latestUserRewardShare = latestWinningWeight > BigInt(0)
        ? Number((latestUserWeight * BigInt(10000)) / latestWinningWeight) / 100
        : 0;
    const recentResults = (wc.allMatches || []).filter(match => match.isResolved).slice().reverse().slice(0, 5);
    const matchTeam = (id: number) => wc.teamPools[id];
    const recommendedTeams = useMemo(() => {
        const active = wc.teamPools.filter(team => team.status === 'active');
        return active.map(team => {
            const stake = wc.userStakes[team.id] || emptyUserStake;
            const poolPressure = totalStakedAll > BigInt(0) ? Number((team.totalPrincipal * BigInt(10000)) / totalStakedAll) / 100 : 0;
            const lowPressureBoost = Math.max(0, 30 - poolPressure);
            const userBoost = stake.amount === BigInt(0) ? 8 : 0;
            const weightBoost = team.totalWeight > BigInt(0) ? 4 : 0;
            return { team, score: lowPressureBoost + userBoost + weightBoost, poolPressure };
        }).sort((a, b) => b.score - a.score || a.team.id - b.team.id).slice(0, 6);
    }, [wc.teamPools, wc.userStakes, emptyUserStake, totalStakedAll]);
    const latestBackedState = (() => {
        if (!latestMatch?.isResolved || !wc.walletAddress) return null;
        const aStake = wc.userStakes[latestMatch.teamA]?.amount || BigInt(0);
        const bStake = wc.userStakes[latestMatch.teamB]?.amount || BigInt(0);
        if (aStake === BigInt(0) && bStake === BigInt(0)) return t.walletNoPosition;
        if (latestMatch.isDraw) return t.walletDrawPosition;
        
        return latestUserReward > BigInt(0) 
            ? t.walletWinningPosition
            : t.walletLosingPosition;
    })();
    const sortOptions = [
        { value: 'group', label: t.groupOrder || 'Group order' },
        { value: 'name', label: t.nameAZ || 'Name A-Z' },
        { value: 'principal', label: t.poolTvl || 'Pool TVL' },
        { value: 'weight', label: t.weight || 'Total weight' },
        { value: 'userStake', label: t.yourStake || 'Your stake' },
        { value: 'pending', label: t.pendingRewards || 'Pending rewards' },
    ];
    const densityOptions = [
        { value: 'comfortable', label: t.comfortableCards || 'Comfortable cards' },
        { value: 'compact', label: t.compactCards || 'Compact cards' },
        { value: 'list', label: t.listRows || 'List rows' },
    ];
    const filterOptions = [
        { value: 'all', label: t.allTeamsFilter },
        { value: 'active', label: t.activeOnlyFilter },
        { value: 'my', label: t.myStakedTeamsFilter },
        { value: 'rewards', label: t.hasRewardsFilter },
        { value: 'locked', label: t.lockedFilter },
        { value: 'eliminated', label: t.eliminatedFilter },
    ];
    const seasonSelectOptions = wc.seasonOptions.map(item => ({
        value: String(item.seasonId),
        label: `Season ${item.seasonId}${item.seasonId === wc.currentSeasonId ? ' (Current)' : ''}`,
        description: `${item.maxTeams || 0} teams · ${item.tournamentEnded ? 'Ended' : item.tournamentStarted ? 'Live' : 'Pending'}`,
    }));

    return (
        <div className="wc-page">
            <div className="wc-football-effects" aria-hidden="true">
                <span />
                <span />
                <span />
            </div>
            <div className="wc-header">
                <div className="wc-header-left">
                    <Link href="/gamefi" className="wc-back-btn">← {t.gamefi}</Link>
                    <h1 className="wc-title"><WorldCupLogo branding={branding} size="sm" />{branding.title || t.title}</h1>
                    <p className="wc-subtitle">{branding.subtitle || t.subtitle}</p>
                </div>
                <div className="wc-header-right">
                    <span className={`wc-network-chip ${isContractConfigured ? 'is-online' : 'is-offline'}`}>
                        <WalletCards size={14} strokeWidth={2.4} />
                        {isContractConfigured ? t.liveContract : t.contractOffline}
                    </span>
                    {isContractConfigured && (
                        <a className="wc-network-chip is-online" href={explorerAddressUrl} target="_blank" rel="noreferrer" title={WORLDCUP_CONTRACT_ADDRESS}>
                            {WORLDCUP_CONTRACT_ADDRESS.slice(0, 6)}...{WORLDCUP_CONTRACT_ADDRESS.slice(-4)}
                        </a>
                    )}
                    {/* Language picker */}
                    <div className="wc-lang-picker">
                        <button className="wc-lang-btn" onClick={() => setShowLangPicker(!showLangPicker)}>
                            <Globe2 size={14} strokeWidth={2.4} />{currentLang?.code.toUpperCase()}
                        </button>
                        {showLangPicker && (
                            <div className="wc-lang-dropdown">
                                {WC_LANGS.map(l => (
                                    <button key={l.code} className={`wc-lang-option ${l.code === lang ? 'active' : ''}`}
                                        onClick={() => changeLang(l.code)}>
                                        <span className="wc-lang-code">{l.code.toUpperCase()}</span>{l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <Link href="/gamefi/worldcup/admin" className="wc-admin-link"><Settings size={15} strokeWidth={2.4} />{t.admin}</Link>
                    <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                </div>
            </div>

            {!isContractConfigured && (
                <div className="wc-config-alert">
                    <span className="wc-config-icon"><AlertTriangle size={18} strokeWidth={2.5} /></span>
                    <div>
                        <strong>{t.contractWarningTitle}</strong>
                        <span>{t.contractWarningDesc}</span>
                    </div>
                    <Link href="/gamefi/worldcup/admin">Admin</Link>
                </div>
            )}

            <StatsBar totalStakedAll={wc.totalStakedAll} rewardPool={wc.rewardPool} matchCount={wc.matchCount}
                tournamentStarted={wc.tournamentStarted} tournamentEnded={wc.tournamentEnded} activeTeams={activeTeams} maxTeams={wc.maxTeams || wc.teamPools.length} t={t} />

            <section className="wc-season-switcher">
                <div className="wc-season-panel">
                    <span className="wc-eyebrow">{t.viewingSeason}</span>
                    <h2>Season {wc.selectedSeasonId}{wc.isCurrentSeason ? t.seasonCurrent : ''}</h2>
                    <p className="wc-season-description">
                        {wc.isCurrentSeason
                            ? t.seasonCurrentDesc
                            : t.seasonOldDesc.replace('{id}', wc.selectedSeasonId.toString())}
                    </p>
                </div>
                <SelectMenu label="Season" value={String(wc.selectedSeasonId)} options={seasonSelectOptions} onChange={value=>wc.setSelectedSeasonId(Number(value))} />
            </section>

            <section className="wc-season-hero" style={{ "--season-accent": branding.accentColor, "--season-secondary": branding.secondaryColor } as React.CSSProperties}>
                <WorldCupLogo branding={branding} />
                <div>
                    <span>{t.seasonIdentity || "Season Identity"}</span>
                    <h2>{branding.title}</h2>
                    <p>{branding.hostText}</p>
                </div>
            </section>

            <section className="wc-player-command">
                <div className="wc-player-summary">
                    <span className="wc-eyebrow">{t.playerDashboard}</span>
                    <h2>{hasAnyPosition ? t.myPositions : t.startPlaying}</h2>
                    
                    <p className="wc-season-description">
                        {hasAnyPosition 
                            ? t.dashboardHasPositionsDesc
                            : t.dashboardNoPositionsDesc}
                    </p>
                </div>

                <div className="wc-player-metrics">
                    <div><span>{t.totalStakedText}</span><strong>{Number(formatEther(totalUserStake)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong><small>$BANMAO</small></div>
                    <div><span>{t.pendingRewards}</span><strong>{Number(formatEther(totalPendingRewards)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong><small>$BANMAO</small></div>
                    <div><span>{t.positionsText}</span><strong>{playerPositions.length}</strong><small>{playerPositions.length === 1 ? t.poolSingular : t.poolsPlural}</small></div>
                </div>

                {!hasAnyPosition && (
                    <div className="wc-onboarding-steps">
                        <span><CheckCircle2 size={15} />{t.step1Connect}</span>
                        <span><Compass size={15} />{t.step2Pick}</span>
                        <span><WalletCards size={15} />{t.step3Stake}</span>
                    </div>
                )}
                {totalPendingRewards > BigInt(0) && (
                    <button className="wc-player-claim" onClick={() => setSelectedTeamId(claimableTeamId >= 0 ? claimableTeamId : playerPositions[0]?.team.id)}>
                        <Award size={17} />{cleanLabel(t.claimRewards, 'Claim Rewards')} · {Number(formatEther(totalPendingRewards)).toLocaleString(undefined,{maximumFractionDigits:2})}
                    </button>
                )}
            </section>

            <div className="wc-dashboard-shell">
                <section className="wc-match-center">
                    <div className="wc-section-head">
                        <div>
                            <span className="wc-eyebrow">{t.matchCenter || "Match Center"}</span>
                            <h2>Pool battle board</h2>
                            <p>{t.matchCenterDesc}</p>
                        </div>
                        <span className={`wc-live-chip ${wc.tournamentStarted ? 'is-live' : ''}`}>
                            <CircleDot size={13} strokeWidth={2.8} />{tournamentStatus}
                        </span>
                    </div>

                    <div className="wc-battle-panel">
                        {topTeams[0] && (
                            <button className="wc-battle-team" onClick={() => setSelectedTeamId(topTeams[0].id)}
                                style={{ '--team-color': topTeams[0].color, '--team-color-secondary': topTeams[0].colorSecondary || topTeams[0].color } as React.CSSProperties}>
                                <span className="wc-battle-rank">#1</span>
                                <TeamCrest code={topTeams[0].code} name={topTeams[0].name} color={topTeams[0].color} colorSecondary={topTeams[0].colorSecondary} size="lg" />
                                <span className="wc-battle-name">{topTeams[0].name}</span>
                                <strong>{topTeams[0].tvlFormatted}</strong>
                                <small>$BANMAO TVL</small>
                                <span className="wc-battle-share">{topOneShare.toLocaleString(undefined, { maximumFractionDigits: 1 })}% {t.poolPressure}</span>
                            </button>
                        )}
                        <div className="wc-versus">
                            <span className="wc-versus-icon"><Gamepad2 size={24} strokeWidth={2.4} /></span>
                            <span>VS</span>
                            <strong>{wc.matchCount}</strong>
                            <small>{t.matches}</small>
                        </div>
                        {topTeams[1] && (
                            <button className="wc-battle-team" onClick={() => setSelectedTeamId(topTeams[1].id)}
                                style={{ '--team-color': topTeams[1].color, '--team-color-secondary': topTeams[1].colorSecondary || topTeams[1].color } as React.CSSProperties}>
                                <span className="wc-battle-rank">#2</span>
                                <TeamCrest code={topTeams[1].code} name={topTeams[1].name} color={topTeams[1].color} colorSecondary={topTeams[1].colorSecondary} size="lg" />
                                <span className="wc-battle-name">{topTeams[1].name}</span>
                                <strong>{topTeams[1].tvlFormatted}</strong>
                                <small>$BANMAO TVL</small>
                                <span className="wc-battle-share">{topTwoShare.toLocaleString(undefined, { maximumFractionDigits: 1 })}% {t.poolPressure}</span>
                            </button>
                        )}
                    </div>

                    <div className="wc-pressure-board">
                        <div className="wc-pressure-labels">
                            <span>{topTeams[0]?.name || t.teamA}</span>
                            <strong>{t.poolPressure}</strong>
                            <span>{topTeams[1]?.name || t.teamB}</span>
                        </div>
                        <div className="wc-pressure-track">
                            <span className="wc-pressure-left" style={{ width: `${Math.max(8, Math.min(92, topOneShare))}%` }} />
                            <span className="wc-pressure-right" style={{ width: `${Math.max(8, Math.min(92, topTwoShare))}%` }} />
                        </div>
                    </div>

                    {latestMatch?.isResolved && (
                        <div className={`wc-result-panel ${claimableRewards > BigInt(0) ? 'has-rewards' : ''}`}>
                            <div className="wc-result-head">
                                <div>
                                    <span className="wc-eyebrow">{t.latestResolvedMatches} #{latestMatch.matchId + 1} · Season {latestMatch.seasonId}</span>
                                    <h3>
                                        {latestMatch.isDraw
                                            ? t.matchDrawn
                                            : `${latestWinner?.name || t.winner || 'Winner'} ${t.matchWins}`}
                                    </h3>
                                </div>
                                <span className="wc-result-state">{latestMatch.isDraw ? t.drawUpper : t.rewardsDistributed}</span>
                            </div>

                            <div className="wc-result-stage">
                                <button className={`wc-result-team-card is-winner ${latestMatch.isDraw ? 'is-draw' : ''}`} onClick={() => latestMatch.isDraw ? setSelectedTeamId(latestMatch.teamA) : latestWinner && setSelectedTeamId(latestWinner.id)}>
                                    <span>{latestMatch.isDraw ? (t.teamA || 'Team A') : (t.winner || 'Winner')}</span>
                                    {(latestWinner || latestTeamA) && <TeamCrest code={(latestWinner || latestTeamA)!.code} name={(latestWinner || latestTeamA)!.name} color={(latestWinner || latestTeamA)!.color} colorSecondary={(latestWinner || latestTeamA)!.colorSecondary} size="md" />}
                                    <strong>{(latestWinner || latestTeamA)?.name || t.teamA}</strong>
                                    <small>{Number(formatEther((latestWinner || latestTeamA)?.totalPrincipal || BigInt(0))).toLocaleString(undefined, { maximumFractionDigits: 2 })} $BANMAO TVL</small>
                                </button>
                                <div className="wc-result-score">
                                    <Trophy size={24} strokeWidth={2.5} />
                                    <strong>{latestTeamA?.name || t.teamA}</strong>
                                    <span>{latestMatch.isDraw ? t.drawUpper : 'VS'}</span>
                                    <strong>{latestTeamB?.name || t.teamB}</strong>
                                </div>
                                <button className={`wc-result-team-card is-loser ${latestMatch.isDraw ? 'is-draw' : ''}`} onClick={() => latestMatch.isDraw ? setSelectedTeamId(latestMatch.teamB) : latestLoser && setSelectedTeamId(latestLoser.id)}>
                                    <span>{latestMatch.isDraw ? (t.teamB || 'Team B') : 'Loser'}</span>
                                    {(latestLoser || latestTeamB) && <TeamCrest code={(latestLoser || latestTeamB)!.code} name={(latestLoser || latestTeamB)!.name} color={(latestLoser || latestTeamB)!.color} colorSecondary={(latestLoser || latestTeamB)!.colorSecondary} size="md" />}
                                    <strong>{(latestLoser || latestTeamB)?.name || t.teamB}</strong>
                                    <small>{latestMatch.isDraw ? t.noSlash : `${Number(formatEther(latestSlashedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} $BANMAO ${t.slashed || 'slashed'}`}</small>
                                </button>
                            </div>

                            <div className="wc-result-metrics">
                                <div>
                                    <span>{t.losingPoolSlash}</span>
                                    <strong>{Number(formatEther(latestSlashedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                    <small>$BANMAO</small>
                                </div>
                                <div>
                                    <span>{t.feePoolBonus}</span>
                                    <strong>{Number(formatEther(latestFeeBonus)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                    <small>$BANMAO</small>
                                </div>
                                <div>
                                    <span>{t.totalDistributed}</span>
                                    <strong>{Number(formatEther(latestTotalReward)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                    <small>{latestBreakdown?.rewardToWinners === false ? t.returnedToFeePool : '$BANMAO'}</small>
                                </div>
                                <div>
                                    <span>{t.yourRewardShare}</span>
                                    <strong>{latestUserRewardShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</strong>
                                    <small>{Number(formatEther(latestUserWeight)).toLocaleString(undefined, { maximumFractionDigits: 2 })} / {Number(formatEther(latestWinningWeight)).toLocaleString(undefined, { maximumFractionDigits: 2 })} weight</small>
                                </div>
                                <div>
                                    <span>{t.claimableInWinnerPool}</span>
                                    <strong>{Number(formatEther(latestUserReward)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                                    <small>$BANMAO</small>
                                </div>
                                <div className="wc-result-claim-state">
                                    <span>{t.walletState}</span>
                                    <strong>
                                        {!wc.walletAddress
                                            ? t.connectWallet
                                            : claimableRewards > BigInt(0)
                                                ? t.readyToClaim
                                                : t.noClaimableReward}
                                    </strong>
                                    <small>
                                        {claimableRewards > BigInt(0)
                                            ? `${Number(formatEther(claimableRewards)).toLocaleString(undefined, { maximumFractionDigits: 2 })} $BANMAO`
                                            : latestMatch.isDraw
                                                ? t.drawNoSlashPayout
                                                : t.walletNoClaimableReward}
                                    </small>
                                </div>
                                {latestBackedState && (
                                    <div className="wc-result-claim-state">
                                        <span>{t.yourMatchPosition}</span>
                                        <strong>{latestBackedState}</strong>
                                        <small>{latestUserReward > BigInt(0) ? `${Number(formatEther(latestUserReward)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO` : t.noClaimableRewardInWinner}</small>
                                    </div>
                                )}
                                {claimableRewards > BigInt(0) ? (
                                    <button className="wc-result-action" onClick={() => setSelectedTeamId(claimableTeamId >= 0 ? claimableTeamId : latestMatch.winningTeam)}>
                                        <Trophy size={16} strokeWidth={2.4} />
                                        {cleanLabel(t.claimRewards, 'Claim Rewards')}
                                    </button>
                                ) : latestWinner ? (
                                    <button className="wc-result-action is-secondary" onClick={() => setSelectedTeamId(latestWinner.id)}>
                                        {t.viewWinningPool}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {recentResults.length > 0 && (
                        <div className="wc-match-history">
                            <div className="wc-match-history-head">
                                <span>{t.matchHistory}</span>
                                <small>{t.latestResolvedMatches}</small>
                            </div>
                            <div className="wc-match-history-list">
                                {recentResults.map(match => {
                                    const aTeam = matchTeam(match.teamA);
                                    const bTeam = matchTeam(match.teamB);
                                    const winner = match.isDraw ? undefined : matchTeam(match.winningTeam);
                                    const breakdown = wc.allMatchBreakdowns?.[wc.allMatches.findIndex(item => item.matchId === match.matchId)];
                                    const historyReward = breakdown?.totalReward ?? match.slashedAmount;
                                    return (
                                        <button key={match.matchId} type="button" onClick={() => winner ? setSelectedTeamId(winner.id) : setSelectedTeamId(match.teamA)}>
                                            <strong>#{match.matchId + 1}</strong>
                                            <span>{match.isDraw ? `${aTeam?.name || t.teamA} ${t.matchDrew} ${bTeam?.name || t.teamB}` : `${winner?.name || t.winner} ${t.matchDefeated} ${winner?.id === match.teamA ? bTeam?.name : aTeam?.name}`}</span>
                                            <small>{Number(formatEther(historyReward)).toLocaleString(undefined, { maximumFractionDigits: 2 })} $BANMAO {t.rewardAmountText}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="wc-mechanics">
                        <div className="wc-mechanic-item"><span className="wc-mechanic-icon"><ShieldAlert size={20} strokeWidth={2.3} /></span><div><strong>{t.slash50}</strong><p>{t.slashDesc}</p></div></div>
                        <div className="wc-mechanic-item"><span className="wc-mechanic-icon"><Timer size={20} strokeWidth={2.3} /></span><div><strong>{t.timeWeighted}</strong><p>{t.timeDesc}</p></div></div>
                        <div className="wc-mechanic-item"><span className="wc-mechanic-icon"><LockKeyhole size={20} strokeWidth={2.3} /></span><div><strong>{t.lockIn}</strong><p>{t.lockDesc}</p></div></div>
                        <div className="wc-mechanic-item"><span className="wc-mechanic-icon"><Coins size={20} strokeWidth={2.3} /></span><div><strong>{t.feePool}</strong><p>{t.feeDesc}</p></div></div>
                    </div>
                </section>
            </div>

            <div className="wc-view-toggle">
                <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid3X3 size={15} strokeWidth={2.4} />{cleanLabel(t.teamGrid, 'Team Grid')}</button>
                <button className={view === 'leaderboard' ? 'active' : ''} onClick={() => setView('leaderboard')}><ChartColumn size={15} strokeWidth={2.4} />{cleanLabel(t.leaderboard, 'Leaderboard')}</button>
                <button className={view === 'fixtures' ? 'active' : ''} onClick={() => setView('fixtures')}><Timer size={15} strokeWidth={2.4} />{t.fixturesTab}</button>
                <button className={view === 'bracket' ? 'active' : ''} onClick={() => setView('bracket')}><Trophy size={15} strokeWidth={2.4} />{t.knockoutBracket}</button>
                <button className={view === 'recommended' ? 'active' : ''} onClick={() => setView('recommended')}><Sparkles size={15} strokeWidth={2.4} />{t.recommendedView}</button>
            </div>

            <div className="wc-main-layout">
                <div className="wc-content">
                    {(view === 'grid' || view === 'leaderboard' || view === 'recommended') && <div className="wc-team-toolbar">
                        <label className="wc-team-search">
                            <Search size={15} strokeWidth={2.4} />
                            <input value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder={t.searchPlaceholder || "Search team name, code, group"} />
                        </label>
                        <SelectMenu label={t.sort || "Sort"} value={teamSort} options={sortOptions} onChange={value => setTeamSort(value as typeof teamSort)} />
                        <SelectMenu label={t.filterLabel} value={teamFilter} options={filterOptions} onChange={value => setTeamFilter(value as typeof teamFilter)} />
                        <SelectMenu label={t.view || "View"} value={gridDensity} options={densityOptions} onChange={value => setGridDensity(value as typeof gridDensity)} />
                        <div className="wc-density-buttons" aria-label="Team card layout">
                            <button className={gridDensity === 'comfortable' ? 'active' : ''} onClick={() => setGridDensity('comfortable')} title={t.comfortableCards || "Comfortable cards"}><LayoutGrid size={15} /></button>
                            <button className={gridDensity === 'compact' ? 'active' : ''} onClick={() => setGridDensity('compact')} title={t.compactCards || "Compact cards"}><Grid3X3 size={15} /></button>
                            <button className={gridDensity === 'list' ? 'active' : ''} onClick={() => setGridDensity('list')} title={t.listRows || "List rows"}><List size={15} /></button>
                        </div>
                    </div>}
                    {view === 'recommended' ? (
                        <div className="wc-recommended-panel">
                            <div className="wc-recommended-head">
                                <div>
                                    <span className="wc-eyebrow">{t.suggestedPools}</span>
                                    <h3>{t.activePoolsReview}</h3>
                                    <p>{t.suggestionDisclaimer}</p>
                                </div>
                                <Filter size={18} />
                            </div>
                            <div className="wc-team-grid wc-team-grid-compact">
                                {recommendedTeams.map(({ team }) => (
                                    <TeamCard key={team.id} team={team} userStake={wc.userStakes[team.id] || emptyUserStake}
                                        totalStakedAll={wc.totalStakedAll || BigInt(0)}
                                        onClick={() => setSelectedTeamId(team.id)} t={t} />
                                ))}
                            </div>
                        </div>
                    ) : view === 'fixtures' ? (
                        <FixtureTimeline fixtures={fixtures} teams={wc.teamPools} lang={lang} t={t} onTeamClick={setSelectedTeamId} />
                    ) : view === 'groups' ? (
                        <GroupStandings
                            teams={wc.teamPools}
                            matches={scheduledMatches}
                            scores={matchScores}
                            labels={{
                                standings: t.standings,
                                team: t.team,
                                playedShort: t.playedShort,
                                winsShort: t.winsShort,
                                drawsShort: t.drawsShort,
                                lossesShort: t.lossesShort,
                                goalsForShort: t.goalsForShort,
                                goalsAgainstShort: t.goalsAgainstShort,
                                goalDiffShort: t.goalDiffShort,
                                pointsShort: t.pointsShort,
                                score: t.score,
                                noScheduled: t.noScheduled,
                                eliminated: t.eliminated,
                            }}
                        />
                    ) : view === 'bracket' ? (
                        <div className="wc-bracket-experience">
                            <div className="wc-bracket-guide">
                                <div>
                                    <span className="wc-eyebrow">{t.bracketGuideEyebrow}</span>
                                    <h3>{t.bracketGuideTitle}</h3>
                                    <p>{t.bracketGuideDesc}</p>
                                </div>
                                <div className="wc-bracket-guide-steps">
                                    <span>{t.bracketGuideStep1}</span>
                                    <span>{t.bracketGuideStep2}</span>
                                    <span>{t.bracketGuideStep3}</span>
                                </div>
                            </div>
                            <KnockoutBracket
                                state={bracketState}
                                teams={wc.teamPools}
                                onTeamClick={(teamId) => setSelectedTeamId(teamId)}
                                labels={{
                                    knockoutBracket: t.knockoutBracket,
                                    knockoutBracketDesc: t.knockoutBracketDesc,
                                    saveBracket: t.saveBracket,
                                    seedBracket: t.seedBracket,
                                    useMatch: t.useMatch,
                                    winner: t.winner,
                                    score: t.score,
                                    eliminated: t.eliminated,
                                    emptySlot: t.emptySlot,
                                }}
                            />
                        </div>
                    ) : view === 'grid' ? (
                        <div className={`wc-team-grid wc-team-grid-${gridDensity}`}>
                            {visibleTeams.map((team) => (
                                <TeamCard key={team.id} team={team} userStake={wc.userStakes[team.id] || emptyUserStake}
                                    totalStakedAll={wc.totalStakedAll || BigInt(0)}
                                    onClick={() => setSelectedTeamId(team.id)} t={t} />
                            ))}
                            {visibleTeams.length === 0 && (
                                <div className="wc-empty-results">{t.noTeamsFound || "No teams match your search."}</div>
                            )}
                        </div>
                    ) : (
                        <div className="wc-leaderboard">
                            <div className="wc-lb-tools">
                                <button className={leaderboardMetric === 'principal' ? 'active' : ''} onClick={() => setLeaderboardMetric('principal')}>{t.principal || 'Principal'}</button>
                                <button className={leaderboardMetric === 'weight' ? 'active' : ''} onClick={() => setLeaderboardMetric('weight')}>{t.weight || 'Weight'}</button>
                            </div>
                            <div className="wc-lb-header"><span>#</span><span>Team</span><span>{leaderboardMetric === 'principal' ? t.tvl : (t.weight || 'Weight')}</span><span>{t.status}</span></div>
                            {leaderboard.map((team, i) => (
                                <div key={team.id} className={`wc-lb-row wc-status-${team.status}`} onClick={() => setSelectedTeamId(team.id)}>
                                    <span className="wc-lb-rank">{i + 1}</span>
                                    <span className="wc-lb-team"><TeamCrest code={team.code} name={team.name} color={team.color} colorSecondary={team.colorSecondary} size="sm" /> {team.name}</span>
                                    <span className="wc-lb-tvl">{leaderboardMetric === 'principal' ? team.tvlFormatted : Number(formatEtherSafe(team.totalWeight)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    <span className={`wc-team-status-badge wc-status-${team.status}`}>{cleanLabel(t[team.status], team.status)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="wc-sidebar">
                    <UserPortfolio userStakes={wc.userStakes} tokenBalance={wc.tokenBalance || BigInt(0)}
                        tokenBalanceLoading={wc.tokenBalanceLoading}
                        tokenBalanceError={wc.tokenBalanceError as Error | null}
                        nativeBalance={wc.nativeBalance}
                        walletAddress={wc.walletAddress}
                        teams={wc.teamPools}
                        tournamentStarted={wc.tournamentStarted} tournamentEnded={wc.tournamentEnded}
                        onTeamClick={id => setSelectedTeamId(id)} t={t} />
                    <OkxInsights walletAddress={wc.walletAddress} t={t} />
                </div>
            </div>

            {selectedTeam && (
                <StakeModal team={selectedTeam} userStake={selectedUserStake}
                    tokenBalance={wc.tokenBalance || BigInt(0)} allowance={wc.allowance || BigInt(0)}
                    onApprove={wc.approve} onStake={wc.stakeToTeam} onUnstake={wc.unstakeFromTeam}
                    onClaimRewards={wc.claimRewards}
                    tournamentStarted={wc.tournamentStarted && wc.isCurrentSeason} tournamentEnded={wc.tournamentEnded || !wc.isCurrentSeason} paused={wc.paused}
                    minStakeAmount={wc.minStakeAmount || BigInt(0)} stakeFeeBp={wc.stakeFee || BigInt(0)} unstakeFeeBp={wc.unstakeFee || BigInt(0)}
                    isPending={wc.isPending || wc.isConfirming} onClose={() => setSelectedTeamId(null)} t={t}
                    txSuccess={wc.txSuccess} txError={wc.txError} txHash={wc.txHash} explorerBaseUrl={XLAYER_EXPLORER_BASE_URL} />
            )}

            <nav className="wc-mobile-action-bar" aria-label="Mobile actions">
                <button onClick={() => setView('grid')} className={view === 'grid' ? 'active' : ''}><Grid3X3 size={16} />{t.teamsTab}</button>
                <button onClick={() => setView('fixtures')} className={view === 'fixtures' ? 'active' : ''}><Timer size={16} />{t.fixturesTabShort}</button>
                <button onClick={() => setView('groups')} className={view === 'groups' ? 'active' : ''}><List size={16} />{t.groupsTab}</button>
                <button onClick={() => setView('bracket')} className={view === 'bracket' ? 'active' : ''}><Trophy size={16} />{t.bracketTab}</button>
                <button onClick={() => setView('recommended')} className={view === 'recommended' ? 'active' : ''}><Sparkles size={16} />{t.suggestTab}</button>
                <button onClick={() => (document.querySelector('.wc-result-panel') || document.querySelector('.wc-match-center'))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><History size={16} />{t.resultsTab}</button>
                <button onClick={() => totalPendingRewards > BigInt(0) && setSelectedTeamId(claimableTeamId >= 0 ? claimableTeamId : 0)} className={totalPendingRewards > BigInt(0) ? 'has-rewards' : ''}><Award size={16} />{t.claimTab}</button>
            </nav>
            <SoundToggle />
        </div>
    );
}

function FixtureTimeline({
    fixtures,
    teams,
    lang,
    t,
    onTeamClick
}: {
    fixtures: WorldCupFixture[];
    teams: Array<{ id: number; name: string; code: string; group: string; color: string; colorSecondary: string }>;
    lang: WCLang;
    t: any;
    onTeamClick?: (teamId: number) => void;
}) {
    const settings = getFixtureDisplaySettings(lang);
    const teamByCode = new Map(teams.map(team => [team.code, team]));
    const rows = fixtures.map(fixture => {
        const teamA = teamByCode.get(fixture.teamACode);
        const teamB = teamByCode.get(fixture.teamBCode);
        const parts = formatFixtureKickoffParts(fixture.kickoffUtc, lang);
        const teamAName = teamA ? (t.countries?.[teamA.name] || teamA.name) : fixture.teamACode;
        const teamBName = teamB ? (t.countries?.[teamB.name] || teamB.name) : fixture.teamBCode;
        return { fixture, parts, teamAName, teamBName, teamA, teamB };
    });
    const grouped = rows.reduce<Record<string, typeof rows>>((acc, row) => {
        acc[row.parts.date] ||= [];
        acc[row.parts.date].push(row);
        return acc;
    }, {});

    return (
        <section className="wc-fixture-timeline">
            <div className="wc-fixture-source-card">
                <div>
                    <span className="wc-eyebrow">{t.fixtureSourceEyebrow}</span>
                    <h3>{t.fixtureTimelineTitle}</h3>
                    <p>{t.fixtureTimelineDesc}</p>
                </div>
                <div className="wc-fixture-source-meta">
                    <span>{fixtures.length || 72} {t.fixtureMatchesCount}</span>
                    <span>{settings.label}</span>
                    <span>{settings.timeZone}</span>
                </div>
            </div>

            {fixtures.length === 0 ? (
                <div className="wc-empty-results">{t.noScheduled}</div>
            ) : Object.entries(grouped).map(([date, dayRows]) => (
                <div key={date} className="wc-fixture-day">
                    <div className="wc-fixture-day-head">
                        <strong>{date}</strong>
                        <span>{dayRows.length} {t.matches}</span>
                    </div>
                    <div className="wc-fixture-day-list">
                        {dayRows.map(({ fixture, parts, teamAName, teamBName, teamA, teamB }) => (
                            <article key={fixture.matchNo} className="wc-fixture-row">
                                <div className="wc-fixture-time">
                                    <strong>{parts.time}</strong>
                                    <span>{parts.weekday}</span>
                                </div>
                                <div className="wc-fixture-match">
                                    <span>{t.group} {fixture.groupName} · {t.matchLabel} {fixture.matchNo}</span>
                                    <div className="wc-fixture-teams">
                                        {teamA ? (
                                            <span 
                                                className={`wc-fixture-team-clickable ${onTeamClick ? 'is-clickable' : ''}`}
                                                onClick={() => onTeamClick?.(teamA.id)}
                                                title={teamAName}
                                            >
                                                <TeamCrest code={teamA.code} name={teamA.name} color={teamA.color} colorSecondary={teamA.colorSecondary} size="sm" />
                                                <strong>{teamAName}</strong>
                                            </span>
                                        ) : <strong>{teamAName}</strong>}
                                        <em>vs</em>
                                        {teamB ? (
                                            <span 
                                                className={`wc-fixture-team-clickable ${onTeamClick ? 'is-clickable' : ''}`}
                                                onClick={() => onTeamClick?.(teamB.id)}
                                                title={teamBName}
                                            >
                                                <TeamCrest code={teamB.code} name={teamB.name} color={teamB.color} colorSecondary={teamB.colorSecondary} size="sm" />
                                                <strong>{teamBName}</strong>
                                            </span>
                                        ) : <strong>{teamBName}</strong>}
                                    </div>
                                </div>
                                <div className={`wc-fixture-status is-${fixture.status}`}>
                                    {fixture.status === "resolved" && fixture.scoreA !== null && fixture.scoreB !== null
                                        ? `${fixture.scoreA} - ${fixture.scoreB}`
                                        : t[fixture.status] || fixture.status}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
}

function formatEtherSafe(value: bigint) {
    return Number(value) / 1e18;
}
