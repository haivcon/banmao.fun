"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import "../worldcup.css";
import { WORLDCUP_CONTRACT_ADDRESS, WORLDCUP_ABI, XLAYER_CHAIN_ID, XLAYER_EXPLORER_BASE_URL } from "../contracts";
import { WC_LANGS, useWCLang, type WCLang } from "../lib/i18n";
import { cleanLabel } from "../lib/labels";
import { getTeamMetadataCsv } from "../lib/teamData";
import { DEFAULT_SEASON_BRANDING, saveSeasonBranding, useSeasonBranding } from "../lib/seasonBranding";
import WorldCupLogo from "../components/WorldCupLogo";
import { AlertTriangle, CheckCircle2, ExternalLink, LockKeyhole, Pause, Play, ShieldX, Trophy, Zap, Loader2 } from "lucide-react";
import { useWorldCup } from "../hooks/useWorldCup";
import { formatEther, isAddress, parseEther } from "viem";
import SelectMenu from "../components/SelectMenu";

const CONTRACT = { address: WORLDCUP_CONTRACT_ADDRESS, abi: WORLDCUP_ABI, chainId: XLAYER_CHAIN_ID } as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function WorldCupAdminPage() {
    const { address } = useAccount();
    const connectedChainId = useChainId();
    const { lang, setLang, t } = useWCLang();
    const a = t;
    const setAdminLang = (value: string) => {
        setLang(value as WCLang);
    };
    const wc = useWorldCup();
    const liveBranding = useSeasonBranding();

    const [teamA, setTeamA] = useState(0);
    const [teamB, setTeamB] = useState(1);
    const [isElim, setIsElim] = useState(false);
    const [matchId, setMatchId] = useState(0);
    const [winnerId, setWinnerId] = useState(0);
    const [champId, setChampId] = useState(0);
    const [msg, setMsg] = useState("");
    const [seasonTeamCount, setSeasonTeamCount] = useState("8");
    const [seasonStartTime, setSeasonStartTime] = useState("");
    const [seasonDurationDays, setSeasonDurationDays] = useState("45");
    const [editTeamId, setEditTeamId] = useState(0);
    const [teamName, setTeamName] = useState("");
    const [teamCode, setTeamCode] = useState("");
    const [teamGroup, setTeamGroup] = useState("");
    const [teamColor, setTeamColor] = useState("#009c3b");
    const [teamColorSecondary, setTeamColorSecondary] = useState("#ffdf00");
    const [stakeFeeInput, setStakeFeeInput] = useState("2");
    const [unstakeFeeInput, setUnstakeFeeInput] = useState("2");
    const [minStakeInput, setMinStakeInput] = useState("1");
    const [withdrawTo, setWithdrawTo] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [recoverToken, setRecoverToken] = useState("");
    const [recoverTo, setRecoverTo] = useState("");
    const [recoverAmount, setRecoverAmount] = useState("");
    const [batchMetadata, setBatchMetadata] = useState("");
    const [inspectMatchId, setInspectMatchId] = useState(0);
    const [teamSearch, setTeamSearch] = useState("");
    const [teamStatusFilter, setTeamStatusFilter] = useState("all");
    const [queueLockedOnly, setQueueLockedOnly] = useState(false);
    const [scheduleRound, setScheduleRound] = useState("Group");
    const [scheduleTime, setScheduleTime] = useState("");
    const [scheduledMatches, setScheduledMatches] = useState<Array<{ id: number; teamA: number; teamB: number; round: string; time: string; elimination: boolean }>>([]);
    const [activityLog, setActivityLog] = useState<string[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ title: string; details: string[]; fn: string; args: any[] } | null>(null);
    const [brandingTitle, setBrandingTitle] = useState(DEFAULT_SEASON_BRANDING.title);
    const [brandingSubtitle, setBrandingSubtitle] = useState(DEFAULT_SEASON_BRANDING.subtitle);
    const [brandingLogoUrl, setBrandingLogoUrl] = useState(DEFAULT_SEASON_BRANDING.logoUrl);
    const [brandingLogoText, setBrandingLogoText] = useState(DEFAULT_SEASON_BRANDING.logoText);
    const [brandingHostText, setBrandingHostText] = useState(DEFAULT_SEASON_BRANDING.hostText);
    const [brandingAccent, setBrandingAccent] = useState(DEFAULT_SEASON_BRANDING.accentColor);
    const [brandingSecondary, setBrandingSecondary] = useState(DEFAULT_SEASON_BRANDING.secondaryColor);

    const isContractConfigured = WORLDCUP_CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
    const { data: owner, isLoading: ownerLoading, error: ownerError } = useReadContract({
        ...CONTRACT,
        functionName: 'owner',
        query: { enabled: isContractConfigured, retry: 1, refetchInterval: 10000 },
    });
    const { data: rewardPool } = useReadContract({ ...CONTRACT, functionName: 'rewardPool', query: { refetchInterval: 10000 } });
    const { data: stakeFee } = useReadContract({ ...CONTRACT, functionName: 'stakeFee', query: { refetchInterval: 10000 } });
    const { data: unstakeFee } = useReadContract({ ...CONTRACT, functionName: 'unstakeFee', query: { refetchInterval: 10000 } });
    const { data: minStakeAmount } = useReadContract({ ...CONTRACT, functionName: 'minStakeAmount', query: { refetchInterval: 10000 } });
    const { data: stakingToken } = useReadContract({ ...CONTRACT, functionName: 'stakingToken', query: { refetchInterval: 15000 } });
    const { data: paused } = useReadContract({ ...CONTRACT, functionName: 'paused', query: { refetchInterval: 5000 } });
    const matchCount = BigInt(wc.matchCount || 0);
    const tournamentStarted = wc.tournamentStarted;
    const tournamentEnded = wc.tournamentEnded;
    const { data: inspectedMatch } = useReadContract({
        ...CONTRACT,
        functionName: 'getMatch',
        args: [BigInt(Math.max(0, inspectMatchId))],
        query: { enabled: isContractConfigured && wc.globalMatchCount > 0 && inspectMatchId < wc.globalMatchCount, refetchInterval: 5000 },
    });
    const allMatches = useMemo(() => {
        return wc.allMatches.map(m => ({
            id: m.matchId,
            seasonId: m.seasonId,
            teamA: m.teamA,
            teamB: m.teamB,
            winner: m.winningTeam,
            locked: m.isLocked,
            resolved: m.isResolved,
            elimination: m.isElimination,
            draw: m.isDraw,
            slashed: m.slashedAmount,
            feeBonus: m.feeBonus,
        }));
    }, [wc.allMatches]);

    const { writeContract, data: hash, isPending, error: txError } = useWriteContract();
    const { isLoading: confirming, isSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (isSuccess) {
            queryClient.invalidateQueries();
        }
    }, [isSuccess, queryClient]);

    useEffect(() => {
        const err = txError || confirmError;
        if (err) {
            let cleanError = err.message || String(err);
            if (cleanError.includes("User rejected the request")) {
                cleanError = "Giao dịch bị từ chối / Transaction was rejected.";
            } else if (cleanError.includes("insufficient funds")) {
                cleanError = "Tài khoản không đủ phí gas / Insufficient funds for gas fee.";
            } else {
                cleanError = cleanError.slice(0, 100) + (cleanError.length > 100 ? "..." : "");
            }
            setMsg("Lỗi/Error: " + cleanError);
        }
    }, [txError, confirmError]);

    const ownerAddress = typeof owner === 'string' ? owner : '';
    const isOwner = !!address && !!ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase();
    const loading = isPending || confirming;
    const teams = wc.teamPools;
    const seasonLocked = !!tournamentStarted || wc.matchCount > 0 || (wc.totalStakedAll || BigInt(0)) > BigInt(0) || (wc.totalUnclaimedRewards || BigInt(0)) > BigInt(0);
    const viewingCurrentSeason = wc.isCurrentSeason;
    const canConfigureNextSeason = viewingCurrentSeason && (!wc.tournamentStarted || wc.tournamentEnded) && wc.lockedMatchCount === 0;
    const canEditCurrentSeasonSetup = viewingCurrentSeason && !seasonLocked;
    const setupInputsDisabled = loading || (!canEditCurrentSeasonSetup && !canConfigureNextSeason);
    const currentSeasonSetupDisabled = loading || !canEditCurrentSeasonSetup;
    const metadataDisabled = currentSeasonSetupDisabled;
    const seasonSelectOptions = wc.seasonOptions.map(item => ({
        value: String(item.seasonId),
        label: `Season ${item.seasonId}${item.seasonId === wc.currentSeasonId ? ' (Current)' : ''}`,
        description: `${item.maxTeams || 0} teams · ${item.tournamentEnded ? 'Ended' : item.tournamentStarted ? 'Live' : 'Pending'}`,
    }));
    const contractExplorerUrl = `${XLAYER_EXPLORER_BASE_URL.replace(/\/$/, '')}/address/${WORLDCUP_CONTRACT_ADDRESS}`;
    const tokenExplorerUrl = typeof stakingToken === 'string' ? `${XLAYER_EXPLORER_BASE_URL.replace(/\/$/, '')}/address/${stakingToken}` : '';
    const teamOptions = teams.map(tm => ({ value: String(tm.id), label: `${tm.code} - ${tm.name}`, description: `${a.team} ${tm.id} · ${a.group} ${tm.group}` }));
    const langOptions = WC_LANGS.map(item => ({ value: item.code, label: item.label }));
    const seasonStartSeconds = Math.max(0, Number(seasonStartTime || 0));
    const seasonDurationSeconds = Math.max(1, Math.round(Number(seasonDurationDays || 0) * 24 * 60 * 60));
    const seasonEndSeconds = seasonStartSeconds + seasonDurationSeconds;

    useEffect(() => {
        setSeasonTeamCount(String(wc.maxTeams || teams.length || 8));
        if (wc.tournamentStartTime !== undefined) setSeasonStartTime(String(wc.tournamentStartTime));
    }, [wc.maxTeams, teams.length, wc.tournamentStartTime]);

    useEffect(() => {
        if (typeof stakeFee === 'bigint') setStakeFeeInput(String(Number(stakeFee) / 100));
        if (typeof unstakeFee === 'bigint') setUnstakeFeeInput(String(Number(unstakeFee) / 100));
        if (typeof minStakeAmount === 'bigint') setMinStakeInput(String(Number(minStakeAmount) / 1e18));
    }, [stakeFee, unstakeFee, minStakeAmount]);

    useEffect(() => {
        if (teams.length > 0 && editTeamId >= teams.length) setEditTeamId(0);
        if (teams.length > 0 && teamA >= teams.length) setTeamA(0);
        if (teams.length > 1 && teamB >= teams.length) setTeamB(1);
        if (teams.length > 0 && winnerId >= teams.length) setWinnerId(0);
        if (teams.length > 0 && champId >= teams.length) setChampId(0);
    }, [teams.length, editTeamId, teamA, teamB, winnerId, champId]);

    useEffect(() => {
        const team = teams[editTeamId] || teams[0];
        if (!team) return;
        setTeamName(team.name);
        setTeamCode(team.code);
        setTeamGroup(team.group);
        setTeamColor(team.color);
        setTeamColorSecondary(team.colorSecondary);
    }, [editTeamId, teams]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('wc_admin_schedule');
            if (raw) setScheduledMatches(JSON.parse(raw));
        } catch {}
    }, []);

    useEffect(() => {
        localStorage.setItem('wc_admin_schedule', JSON.stringify(scheduledMatches));
    }, [scheduledMatches]);

    useEffect(() => {
        setBrandingTitle(liveBranding.title);
        setBrandingSubtitle(liveBranding.subtitle);
        setBrandingLogoUrl(liveBranding.logoUrl);
        setBrandingLogoText(liveBranding.logoText);
        setBrandingHostText(liveBranding.hostText);
        setBrandingAccent(liveBranding.accentColor);
        setBrandingSecondary(liveBranding.secondaryColor);
    }, [liveBranding]);

    // Gate: block non-owners
    if (!address) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16}}>
                <LockKeyhole size={64} strokeWidth={1.8} color="#14b8a6" />
                <h1 style={{fontSize:24,fontWeight:800}}>{cleanLabel(t.accessDenied)}</h1>
                <p style={{color:'#64748b'}}>{t.connectWallet}</p>
                <ConnectButton />
                <Link href="/gamefi/worldcup" style={{color:'#10b981',marginTop:16}}>{t.backToGame}</Link>
            </div>
        );
    }
    if (!isContractConfigured) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,textAlign:'center',padding:24}}>
                <AlertTriangle size={64} strokeWidth={1.8} color="#f59e0b" />
                <h1 style={{fontSize:24,fontWeight:800}}>{a.contractNotConfigured}</h1>
                <p style={{color:'#94a3b8',maxWidth:560}}>{a.contractNotConfiguredDesc}</p>
                <ConnectButton />
                <Link href="/gamefi/worldcup" style={{color:'#10b981',marginTop:16}}>{t.backToGame}</Link>
            </div>
        );
    }
    if (connectedChainId !== XLAYER_CHAIN_ID) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,textAlign:'center',padding:24}}>
                <AlertTriangle size={64} strokeWidth={1.8} color="#f59e0b" />
                <h1 style={{fontSize:24,fontWeight:800}}>{a.wrongNetwork}</h1>
                <p style={{color:'#94a3b8',maxWidth:560}}>{a.wrongNetworkDesc} {a.connected}: {connectedChainId}. Required: {XLAYER_CHAIN_ID}.</p>
                <ConnectButton />
                <Link href="/gamefi/worldcup" style={{color:'#10b981',marginTop:16}}>{t.backToGame}</Link>
            </div>
        );
    }
    if (ownerLoading || (!ownerAddress && !ownerError)) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,textAlign:'center',padding:24}}>
                <LockKeyhole size={64} strokeWidth={1.8} color="#14b8a6" />
                <h1 style={{fontSize:24,fontWeight:800}}>{a.readingOwner}</h1>
                <p style={{color:'#94a3b8',maxWidth:620}}>{a.readingOwnerDesc} Chain {XLAYER_CHAIN_ID}: {WORLDCUP_CONTRACT_ADDRESS}.</p>
                <ConnectButton />
            </div>
        );
    }
    if (ownerError || !ownerAddress) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16,textAlign:'center',padding:24}}>
                <AlertTriangle size={64} strokeWidth={1.8} color="#f59e0b" />
                <h1 style={{fontSize:24,fontWeight:800}}>{a.cannotReadOwner}</h1>
                <p style={{color:'#94a3b8',maxWidth:680}}>{a.cannotReadOwnerDesc}</p>
                <p style={{color:'#475569',fontSize:13}}>{a.contract}: {WORLDCUP_CONTRACT_ADDRESS}</p>
                <p style={{color:'#475569',fontSize:13}}>{a.error}: {ownerError?.message || 'owner() returned no data'}</p>
                <ConnectButton />
                <Link href="/gamefi/worldcup" style={{color:'#10b981',marginTop:16}}>{t.backToGame}</Link>
            </div>
        );
    }
    if (!isOwner) {
        return (
            <div className="wc-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:16}}>
                <ShieldX size={64} strokeWidth={1.8} color="#ef4444" />
                <h1 style={{fontSize:24,fontWeight:800}}>{cleanLabel(t.accessDenied)}</h1>
                <p style={{color:'#ef4444',maxWidth:400,textAlign:'center'}}>{t.notOwner}</p>
                <p style={{color:'#475569',fontSize:13}}>{a.connected}: {address}</p>
                <p style={{color:'#475569',fontSize:13}}>{a.owner}: {ownerAddress}</p>
                <ConnectButton />
                <Link href="/gamefi/worldcup" style={{color:'#10b981',marginTop:16}}>{t.backToGame}</Link>
            </div>
        );
    }

    const exec = (fn: string, args: any[]) => {
        setMsg(`${fn}...`);
        setActivityLog(log => [`${new Date().toLocaleTimeString()} · ${fn}`, ...log].slice(0, 12));
        writeContract({ ...CONTRACT, functionName: fn, args } as any);
    };
    const requestConfirm = (title: string, details: string[], fn: string, args: any[]) => setConfirmAction({ title, details, fn, args });
    const confirmExec = () => {
        if (!confirmAction) return;
        exec(confirmAction.fn, confirmAction.args);
        setConfirmAction(null);
    };
    if (isSuccess && msg.endsWith("...")) setMsg("OK");
    const teamLabel = (id: number | bigint) => {
        const team = teams[Number(id)];
        return team ? `${team.code} - ${team.name}` : `Team ${String(id)}`;
    };
    const parseBatchRows = () => {
        const rows = batchMetadata.split(/\r?\n/).map(r => r.trim()).filter(Boolean).map(row => row.split(',').map(cell => cell.trim()));
        if (rows.length === 0) throw new Error('No metadata rows');
        const teamIds: bigint[] = [];
        const names: string[] = [];
        const codes: string[] = [];
        const groups: string[] = [];
        const colors: string[] = [];
        const colorSecondaries: string[] = [];
        for (const cells of rows) {
            if (cells.length !== 6) throw new Error('Each row must have: id,name,code,group,color,colorSecondary');
            const id = Number(cells[0]);
            if (!Number.isInteger(id) || id < 0 || id >= teams.length) throw new Error(`Invalid team id: ${cells[0]}`);
            teamIds.push(BigInt(id));
            names.push(cells[1]);
            codes.push(cells[2].toUpperCase());
            groups.push(cells[3]);
            colors.push(cells[4]);
            colorSecondaries.push(cells[5]);
        }
        return [teamIds, names, codes, groups, colors, colorSecondaries];
    };
    const saveBatchMetadata = () => {
        try {
            requestConfirm(a.saveBatch, [`Rows: ${batchMetadata.split(/\r?\n/).filter(Boolean).length}`, a.batchCsvHelp], 'setTeamMetadataBatch', parseBatchRows());
        } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Invalid batch metadata');
        }
    };

    const visibleMatches = allMatches.filter(m => !queueLockedOnly || (m.locked && !m.resolved));
    const filteredTeams = teams.filter(team => {
        const q = teamSearch.trim().toLowerCase();
        const matchesQuery = !q || `${team.id} ${team.name} ${team.code} ${team.group}`.toLowerCase().includes(q);
        const matchesStatus = teamStatusFilter === 'all' || team.status === teamStatusFilter;
        return matchesQuery && matchesStatus;
    });
    const teamStatusOptions = [
        { value: 'all', label: a.allStatuses },
        { value: 'active', label: a.activeOnly },
        { value: 'locked', label: a.lockedOnly },
        { value: 'eliminated', label: a.eliminatedOnly },
    ];
    const selectedMatch = allMatches.find(m => m.id === matchId);
    const resolveWinner = selectedMatch && (winnerId === selectedMatch.teamA || winnerId === selectedMatch.teamB) ? teams[winnerId] : undefined;
    const resolveLoserId = selectedMatch && resolveWinner ? (winnerId === selectedMatch.teamA ? selectedMatch.teamB : selectedMatch.teamA) : undefined;
    const resolveLoser = resolveLoserId !== undefined ? teams[resolveLoserId] : undefined;
    const estimatedSlash = resolveLoser ? resolveLoser.totalPrincipal / BigInt(2) : BigInt(0);
    const estimatedFeeBonus = rewardPool ? (rewardPool as bigint) / BigInt(4) : BigInt(0);
    const estimatedTotalReward = estimatedSlash + estimatedFeeBonus;
    const resolveWinnerWeight = resolveWinner ? resolveWinner.totalWeight : BigInt(0);
    const rewardFallbackToPool = !!resolveWinner && resolveWinnerWeight === BigInt(0);
    const canResolveSelectedMatch = viewingCurrentSeason && !!selectedMatch && selectedMatch.locked && !selectedMatch.resolved && !!resolveWinner && !!tournamentStarted && !loading;
    const validationItems = [
        { ok: !!isOwner, text: isOwner ? a.connectedOwner : a.notOwner || t.notOwner },
        { ok: connectedChainId === XLAYER_CHAIN_ID, text: `${a.connected}: ${connectedChainId} / ${XLAYER_CHAIN_ID}` },
        { ok: viewingCurrentSeason, text: viewingCurrentSeason ? `Season ${wc.currentSeasonId}` : `Read-only Season ${wc.selectedSeasonId}` },
        { ok: !!tournamentStarted, text: cleanLabel(tournamentStarted ? t.live : t.pending) },
        { ok: teamA !== teamB, text: teamA === teamB ? `${t.teamA} = ${t.teamB}` : `${teamLabel(teamA)} vs ${teamLabel(teamB)}` },
        { ok: teams[teamA]?.status === 'active' && teams[teamB]?.status === 'active', text: `${t.lockMatch}: ${teams[teamA]?.status || '-'} / ${teams[teamB]?.status || '-'}` },
        { ok: !selectedMatch || selectedMatch.teamA === winnerId || selectedMatch.teamB === winnerId || selectedMatch.resolved, text: selectedMatch ? `${t.winner}: ${teamLabel(winnerId)}` : a.inspectMatch },
        { ok: Number(stakeFeeInput || 0) <= 10 && Number(unstakeFeeInput || 0) <= 10, text: `${a.financeControls}: ${stakeFeeInput}% / ${unstakeFeeInput}%` },
    ];
    const workflow = [
        { title: a.seasonSetup, state: seasonLocked ? a.done : a.ready, done: seasonLocked, blocked: false },
        { title: cleanLabel(t.step1), state: tournamentStarted ? a.done : a.ready, done: !!tournamentStarted, blocked: seasonLocked && !!tournamentEnded },
        { title: cleanLabel(t.step2), state: tournamentStarted ? a.ready : a.blocked, done: false, blocked: !tournamentStarted },
        { title: cleanLabel(t.step3), state: wc.lockedMatchCount > 0 ? a.ready : a.blocked, done: false, blocked: wc.lockedMatchCount === 0 },
        { title: cleanLabel(t.step4), state: wc.lockedMatchCount === 0 && tournamentStarted ? a.ready : a.blocked, done: !!tournamentEnded, blocked: wc.lockedMatchCount > 0 || !tournamentStarted },
    ];
    const addScheduledMatch = () => {
        if (teamA === teamB) return;
        setScheduledMatches(rows => [{ id: Date.now(), teamA, teamB, round: scheduleRound || 'Group', time: scheduleTime, elimination: isElim }, ...rows].slice(0, 24));
    };
    const currentBranding = {
        title: brandingTitle,
        subtitle: brandingSubtitle,
        logoUrl: brandingLogoUrl,
        logoText: brandingLogoText,
        hostText: brandingHostText,
        accentColor: brandingAccent,
        secondaryColor: brandingSecondary,
    };
    const persistBranding = () => {
        saveSeasonBranding(currentBranding);
        setMsg("Branding saved");
    };
    const resetBranding = () => {
        saveSeasonBranding(DEFAULT_SEASON_BRANDING);
        setMsg("Branding reset");
    };

    const s = {
        section: { background:'rgba(255,255,255,0.03)',borderRadius:24,padding:20,marginBottom:16,border:'1px solid rgba(255,255,255,0.06)' } as const,
        select: { width:'100%',padding:12,background:'rgba(15,23,42,0.78)',color:'#fff',border:'1px solid rgba(148,163,184,0.16)',borderRadius:14,fontSize:14,boxSizing:'border-box' as const } as const,
        btn: (bg:string) => ({padding:'12px 24px',background:bg,color:'#fff',border:'none',borderRadius:9999,cursor:'pointer',fontWeight:700 as const,fontSize:14,display:'inline-flex',alignItems:'center',gap:8}),
        row: { display:'flex',gap:12,marginBottom:12 } as const,
        label: { flex:1 } as const,
        lbl: { fontSize:12,color:'#64748b',display:'block',marginBottom:4 } as const,
        input: { width:'100%',padding:12,background:'rgba(15,23,42,0.78)',color:'#fff',border:'1px solid rgba(148,163,184,0.16)',borderRadius:14,fontSize:14,boxSizing:'border-box' as const,outline:'none' } as const,
    };
    const help = (text: string) => <p className="wc-admin-field-hint">{text}</p>;

    const activeTeamsCount = teams.filter(tm => tm.status === 'active').length;
    const isStep1Active = !tournamentStarted;
    const isStep2Active = !!tournamentStarted && !tournamentEnded && wc.lockedMatchCount === 0 && activeTeamsCount > 1;
    const isStep3Active = !!tournamentStarted && !tournamentEnded && wc.lockedMatchCount > 0;
    const isStep4Active = !!tournamentStarted && !tournamentEnded && wc.lockedMatchCount === 0 && activeTeamsCount <= 1;

    return (
        <div className="wc-page wc-admin-page" style={{padding:24}}>
            <div style={{maxWidth:1600,margin:'0 auto'}}>
                <div className="wc-admin-topbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
                    <Link href="/gamefi/worldcup" className="wc-back-btn">{t.backToGame}</Link>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <SelectMenu label="Season" value={String(wc.selectedSeasonId)} options={seasonSelectOptions} onChange={value=>wc.setSelectedSeasonId(Number(value))} className="wc-admin-season-select" />
                        <SelectMenu label={a.language} value={lang} options={langOptions} onChange={setAdminLang} className="wc-admin-lang-select" />
                        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                    </div>
                </div>
                {!viewingCurrentSeason && (
                    <div className="wc-season-alert">
                        <strong>Read-only season view</strong>
                        <span>You are viewing Season {wc.selectedSeasonId}. Admin write actions apply only to current Season {wc.currentSeasonId}; old seasons remain available for user claim and unstake.</span>
                    </div>
                )}
                <h1 style={{fontSize:24,fontWeight:900,marginBottom:8,display:'flex',alignItems:'center',gap:10}}><Trophy size={24} strokeWidth={2.3} />{t.admin} {a.panel}</h1>
                {msg && (
                    <div style={{
                        padding: "12px 18px",
                        background: msg === 'OK' ? 'rgba(16, 185, 129, 0.08)' : msg.startsWith('Lỗi/Error') ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                        border: msg === 'OK' ? '1px solid rgba(16, 185, 129, 0.2)' : msg.startsWith('Lỗi/Error') ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                        color: msg === 'OK' ? '#34d399' : msg.startsWith('Lỗi/Error') ? '#f87171' : '#60a5fa',
                        borderRadius: 12,
                        marginBottom: 16,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.3s ease'
                    }}>
                        {msg === 'OK' ? <CheckCircle2 size={16} /> : msg.startsWith('Lỗi/Error') ? <AlertTriangle size={16} /> : <Loader2 size={16} className="animate-spin" />}{msg}
                    </div>
                )}

                {/* --- WORKFLOW DECK GRID AT THE VERY TOP --- */}
                <div className="wc-admin-workflow-deck-grid">
                    {/* Workflow: Step 1 */}
                    <div className={`wc-admin-workflow-card ${isStep1Active ? 'wc-admin-active-step-card' : ''}`}>
                        <h2 style={{fontSize:16,marginTop:0}}>{cleanLabel(t.step1)}</h2>
                        <p className="wc-admin-section-desc">{a.startHelp}</p>
                        <button onClick={()=>requestConfirm(cleanLabel(t.startTournament),[a.startHelp],'startTournament',[])} disabled={loading||!!tournamentStarted||!viewingCurrentSeason} style={s.btn(tournamentStarted?'#475569':'#059669')} className={isStep1Active ? 'wc-admin-pulse-btn' : ''}>
                            {tournamentStarted ? cleanLabel(t.alreadyStarted) : cleanLabel(t.startTournament)}
                        </button>
                    </div>

                    {/* Workflow: Step 2 */}
                    <div className={`wc-admin-workflow-card ${isStep2Active ? 'wc-admin-active-step-card' : ''}`}>
                        <h2 style={{fontSize:16,marginTop:0}}>{cleanLabel(t.step2)}</h2>
                        <p className="wc-admin-section-desc">{t.step2Desc}. {a.lockHelp}</p>
                        <div style={s.row}>
                            <label style={s.label}><span style={s.lbl}>{t.teamA}</span>
                                <SelectMenu value={String(teamA)} options={teamOptions} onChange={value=>setTeamA(Number(value))} className="wc-admin-select" />
                            </label>
                            <label style={s.label}><span style={s.lbl}>{t.teamB}</span>
                                <SelectMenu value={String(teamB)} options={teamOptions} onChange={value=>setTeamB(Number(value))} className="wc-admin-select" />
                            </label>
                        </div>
                        <label className="wc-admin-checkbox" style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontSize:14}}>
                            <input type="checkbox" checked={isElim} onChange={e=>setIsElim(e.target.checked)} /> {cleanLabel(t.elimination)}
                        </label>
                        {help(a.eliminationHelp)}
                        <button onClick={()=>requestConfirm(t.lockMatch,[`${t.teamA}: ${teamLabel(teamA)}`,`${t.teamB}: ${teamLabel(teamB)}`,`${t.elimination}: ${isElim ? a.yes : a.no}`],'lockMatch',[BigInt(teamA),BigInt(teamB),isElim])}
                            disabled={loading||!viewingCurrentSeason||teamA===teamB||!tournamentStarted||teams[teamA]?.status !== 'active'||teams[teamB]?.status !== 'active'} style={s.btn('#3b82f6')} className={isStep2Active ? 'wc-admin-pulse-btn' : ''}><LockKeyhole size={15} /> {t.lockMatch}</button>
                    </div>

                    {/* Workflow: Step 3 */}
                    <div className={`wc-admin-workflow-card ${isStep3Active ? 'wc-admin-active-step-card' : ''}`}>
                        <h2 style={{fontSize:16,marginTop:0}}>{cleanLabel(t.step3)}</h2>
                        <p className="wc-admin-section-desc">{t.step3Desc}. {a.resolveHelp}</p>
                        <div style={s.row}>
                            <label style={s.label}><span style={s.lbl}>{t.matchId}</span>
                                <input type="number" value={matchId} onChange={e=>setMatchId(Number(e.target.value))} style={{...s.select,width:'100%'}} min={0} />
                                {help(a.inspectHelp)}
                            </label>
                            <label style={s.label}><span style={s.lbl}>{t.winner}</span>
                                <SelectMenu value={String(winnerId)} options={teamOptions} onChange={value=>setWinnerId(Number(value))} className="wc-admin-select" />
                            </label>
                        </div>
                        <div className="wc-admin-resolve-preview">
                            <div className="wc-admin-resolve-preview-head">
                                <strong>Resolve preview</strong>
                                <span className={canResolveSelectedMatch ? 'ok' : 'warn'}>{canResolveSelectedMatch ? (a.validationPassed || 'Ready') : (a.warning || 'Check match')}</span>
                            </div>
                            {selectedMatch ? (
                                <div className="wc-admin-resolve-preview-grid">
                                    <div>
                                        <span>{t.matchId}</span>
                                        <strong>#{selectedMatch.id}</strong>
                                        <small>{selectedMatch.locked ? t.locked : a.open} · {selectedMatch.resolved ? a.resolved : cleanLabel(t.pending)}</small>
                                    </div>
                                    <div className="is-winner">
                                        <span>{t.winner}</span>
                                        <strong>{resolveWinner ? `${resolveWinner.code} - ${resolveWinner.name}` : a.warning}</strong>
                                        <small>{resolveWinner ? `${Number(formatEther(resolveWinner.totalPrincipal)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO TVL` : 'Winner must be Team A or Team B'}</small>
                                    </div>
                                    <div className="is-loser">
                                        <span>Loser</span>
                                        <strong>{resolveLoser ? `${resolveLoser.code} - ${resolveLoser.name}` : '-'}</strong>
                                        <small>{Number(formatEther(estimatedSlash)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO estimated slash</small>
                                    </div>
                                    <div>
                                        <span>{a.rewardPool || 'Reward pool bonus'}</span>
                                        <strong>{Number(formatEther(estimatedFeeBonus)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO</strong>
                                        <small>{t.feePoolBonusDesc}</small>
                                    </div>
                                    <div>
                                        <span>{t.totalRewardPreview}</span>
                                        <strong>{Number(formatEther(estimatedTotalReward)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO</strong>
                                        <small>{rewardFallbackToPool ? t.rewardReturnsToPool : t.distributedByWinnerWeight}</small>
                                    </div>
                                    <div>
                                        <span>{t.winnerPoolWeight}</span>
                                        <strong>{Number(formatEther(resolveWinnerWeight)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong>
                                        <small>{t.rewardShareBase}</small>
                                    </div>
                                </div>
                            ) : (
                                <p>{a.inspectHelp || 'Select a locked match before resolving.'}</p>
                            )}
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                            <button onClick={()=>requestConfirm(t.resolveMatch,[`${t.matchId}: ${matchId}`,`${t.winner}: ${teamLabel(winnerId)}`,`Loser: ${resolveLoser ? teamLabel(resolveLoser.id) : '-'}`,`${a.slashed}: ${Number(formatEther(estimatedSlash)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO`,`Fee bonus: ${Number(formatEther(estimatedFeeBonus)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO`,`Total reward: ${Number(formatEther(estimatedTotalReward)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO`, rewardFallbackToPool ? 'Warning: winner pool has no weight; reward returns to reward pool.' : `Winner weight: ${Number(formatEther(resolveWinnerWeight)).toLocaleString(undefined,{maximumFractionDigits:2})}`],'resolveMatch',[BigInt(matchId),BigInt(winnerId),estimatedFeeBonus])} disabled={!canResolveSelectedMatch} style={s.btn('#f59e0b')} className={isStep3Active ? 'wc-admin-pulse-btn' : ''}><Zap size={15} /> {t.resolveMatch}</button>
                            <button onClick={()=>requestConfirm(a.resolveDraw,[`${t.matchId}: ${matchId}`,`${t.teamA}: ${selectedMatch ? teamLabel(selectedMatch.teamA) : '-'}`,`${t.teamB}: ${selectedMatch ? teamLabel(selectedMatch.teamB) : '-'}`,a.resolveHelp],'resolveDraw',[BigInt(matchId)])} disabled={!viewingCurrentSeason || !selectedMatch || !selectedMatch.locked || selectedMatch.resolved || loading || !tournamentStarted} style={s.btn('#64748b')}>{a.resolveDraw}</button>
                        </div>
                        <div style={{padding:12,border:'1px solid rgba(148,163,184,0.12)',borderRadius:12,background:'rgba(2,6,23,0.2)'}}>
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.inspectMatch}</span>
                                    <input type="number" min={0} max={Math.max(0, Number(matchCount || 0) - 1)} value={inspectMatchId} onChange={e=>setInspectMatchId(Number(e.target.value))} style={s.input} />
                                    {help(a.inspectHelp)}
                                </label>
                            </div>
                            {inspectedMatch ? (
                                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,fontSize:13}}>
                                    <div><span style={s.lbl}>Season</span><strong>{String(inspectedMatch[0])}</strong></div>
                                    <div><span style={s.lbl}>{t.teamA}</span><strong>{teamLabel(Number(inspectedMatch[1]))}</strong></div>
                                    <div><span style={s.lbl}>{t.teamB}</span><strong>{teamLabel(Number(inspectedMatch[2]))}</strong></div>
                                    <div><span style={s.lbl}>{t.winner}</span><strong>{Number(inspectedMatch[3]) === 0 && !inspectedMatch[5] ? '-' : teamLabel(Number(inspectedMatch[3]))}</strong></div>
                                    <div><span style={s.lbl}>{a.state}</span><strong>{inspectedMatch[5] ? inspectedMatch[7] ? a.draw : a.resolved : inspectedMatch[4] ? t.locked : a.open}</strong></div>
                                    <div><span style={s.lbl}>{t.elimination}</span><strong>{inspectedMatch[6] ? a.yes : a.no}</strong></div>
                                    <div><span style={s.lbl}>{a.slashed}</span><strong>{Number(formatEther(inspectedMatch[8])).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
                                    <div><span style={s.lbl}>Fee bonus</span><strong>{Number(formatEther(inspectedMatch[9])).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
                                </div>
                            ) : <span style={{fontSize:13,color:'#64748b'}}>{a.noMatchData}</span>}
                        </div>
                    </div>

                    {/* Workflow: Step 4 */}
                    <div className={`wc-admin-workflow-card ${isStep4Active ? 'wc-admin-active-step-card' : ''}`}>
                        <h2 style={{fontSize:16,marginTop:0}}>{cleanLabel(t.step4)}</h2>
                        <p className="wc-admin-section-desc">{a.championHelp}</p>
                        <div style={s.row}>
                            <label style={s.label}><span style={s.lbl}>{t.championTeam}</span>
                                <SelectMenu value={String(champId)} options={teamOptions} onChange={value=>setChampId(Number(value))} className="wc-admin-select" />
                            </label>
                        </div>
                        <button onClick={()=>requestConfirm(t.declareChampion,[`${t.championTeam}: ${teamLabel(champId)}`,a.championHelp],'declareChampion',[BigInt(champId)])} disabled={loading||!viewingCurrentSeason||!tournamentStarted||!!tournamentEnded||wc.lockedMatchCount>0||teams[champId]?.status !== 'active'} style={s.btn('#8b5cf6')} className={isStep4Active ? 'wc-admin-pulse-btn' : ''}><Trophy size={15} /> {t.declareChampion}</button>
                    </div>
                </div>

                <div className="wc-admin-dashboard-container">
                    
                    {/* COLUMN 1: Setup & Branding */}
                    <div className="wc-admin-column">
                        
                        {/* Section 1: Season Branding */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.seasonBranding}</h2>
                            <p className="wc-admin-section-desc">{a.seasonBrandingDesc}</p>
                            <div className="wc-branding-editor">
                                <div className="wc-branding-preview" style={{ "--season-accent": brandingAccent, "--season-secondary": brandingSecondary } as React.CSSProperties}>
                                    <WorldCupLogo branding={currentBranding} />
                                    <strong>{brandingTitle}</strong>
                                    <span>{brandingHostText}</span>
                                </div>
                                <div className="wc-branding-fields">
                                    <label><span style={s.lbl}>{a.seasonTitle}</span><input value={brandingTitle} onChange={e=>setBrandingTitle(e.target.value)} style={s.input} /></label>
                                    <label><span style={s.lbl}>{a.seasonSubtitle}</span><input value={brandingSubtitle} onChange={e=>setBrandingSubtitle(e.target.value)} style={s.input} /></label>
                                    <label><span style={s.lbl}>{a.hostText}</span><input value={brandingHostText} onChange={e=>setBrandingHostText(e.target.value)} style={s.input} /></label>
                                    <label><span style={s.lbl}>{a.logoUrl}</span><input value={brandingLogoUrl} onChange={e=>setBrandingLogoUrl(e.target.value)} placeholder="https://..." style={s.input} /></label>
                                    <div style={s.row}>
                                        <label style={s.label}><span style={s.lbl}>{a.logoText}</span><input value={brandingLogoText} onChange={e=>setBrandingLogoText(e.target.value)} maxLength={8} style={s.input} /></label>
                                        <label style={s.label}><span style={s.lbl}>{a.accentColor}</span><input type="color" value={brandingAccent} onChange={e=>setBrandingAccent(e.target.value)} style={{...s.input,padding:4,height:42}} /></label>
                                        <label style={s.label}><span style={s.lbl}>{a.secondaryColor}</span><input type="color" value={brandingSecondary} onChange={e=>setBrandingSecondary(e.target.value)} style={{...s.input,padding:4,height:42}} /></label>
                                    </div>
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                        <button type="button" onClick={persistBranding} style={s.btn('#14b8a6')}>{a.saveBranding}</button>
                                        <button type="button" onClick={resetBranding} style={s.btn('#64748b')}>{a.resetBranding}</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Mascot Manager */}
                        <MascotManager teams={teams} />

                        {/* Section 2: Season Team Setup */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.seasonSetup}</h2>
                            <p className="wc-admin-section-desc">{a.seasonSetupDesc}</p>
                            {seasonLocked && <div style={{padding:10,borderRadius:10,background:'rgba(245,158,11,0.1)',color:'#fbbf24',fontSize:13,marginBottom:12}}>
                                {a.seasonLocked}
                            </div>}
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.teamCount}</span>
                                    <input type="number" min={2} max={64} value={seasonTeamCount} onChange={e=>setSeasonTeamCount(e.target.value)} style={s.input} disabled={setupInputsDisabled} />
                                    {help(a.teamCountHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.startTimestamp}</span>
                                    <input type="number" min={0} value={seasonStartTime} onChange={e=>setSeasonStartTime(e.target.value)} style={s.input} disabled={setupInputsDisabled} />
                                    {help(a.startTimestampHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>Duration days</span>
                                    <input type="number" min={1} value={seasonDurationDays} onChange={e=>setSeasonDurationDays(e.target.value)} style={s.input} disabled={setupInputsDisabled} />
                                    {help('Season length used to calculate tournamentEndTime.')}
                                </label>
                                <div style={{display:'flex',alignItems:'flex-end'}}>
                                    <button onClick={()=>requestConfirm(a.saveCount,[`${a.teamCount}: ${seasonTeamCount}`],'setMaxTeams',[BigInt(Math.max(2, Math.min(64, Number(seasonTeamCount || 0))))])}
                                        disabled={currentSeasonSetupDisabled} style={s.btn(currentSeasonSetupDisabled?'#475569':'#0f766e')}>{a.saveCount}</button>
                                </div>
                            </div>
                            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                                <button onClick={()=>requestConfirm(a.saveStartTime,[`${a.startTimestamp}: ${seasonStartSeconds}`,`End timestamp: ${seasonEndSeconds}`],'setTournamentTimes',[BigInt(seasonStartSeconds),BigInt(seasonEndSeconds)])}
                                    disabled={currentSeasonSetupDisabled} style={s.btn(currentSeasonSetupDisabled?'#475569':'#0f766e')}>{a.saveStartTime}</button>
                                <button onClick={()=>requestConfirm(a.configureNextSeason,[`${a.teamCount}: ${seasonTeamCount}`,`${a.startTimestamp}: ${seasonStartSeconds}`,`Duration: ${seasonDurationDays || '0'} days`,a.configureNextSeasonHelp],'configureNextSeason',[BigInt(Math.max(2, Math.min(64, Number(seasonTeamCount || 0)))),BigInt(seasonStartSeconds),BigInt(seasonDurationSeconds)])}
                                    disabled={loading || !canConfigureNextSeason}
                                    style={s.btn(canConfigureNextSeason ? '#2563eb' : '#475569')}>{a.configureNextSeason}</button>
                            </div>
                            {help(a.configureNextSeasonHelp)}
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.team}</span>
                                    <SelectMenu value={String(editTeamId)} options={teamOptions} onChange={value=>setEditTeamId(Number(value))} disabled={metadataDisabled} className="wc-admin-select" />
                                    {help(a.teamHelp)}
                                </label>
                            </div>
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.name}</span>
                                    <input value={teamName} onChange={e=>setTeamName(e.target.value)} maxLength={40} style={s.input} disabled={metadataDisabled} autoComplete="off" />
                                    {help(a.nameHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.code}</span>
                                    <input value={teamCode} onChange={e=>setTeamCode(e.target.value.toUpperCase())} maxLength={8} style={s.input} disabled={metadataDisabled} autoComplete="off" />
                                    {help(a.codeHelp)}
                                </label>
                            </div>
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.group}</span>
                                    <input value={teamGroup} onChange={e=>setTeamGroup(e.target.value)} maxLength={16} style={s.input} disabled={metadataDisabled} autoComplete="off" />
                                    {help(a.teamGroupHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.primaryColor}</span>
                                    <input type="color" value={teamColor} onChange={e=>setTeamColor(e.target.value)} style={{...s.input,padding:4,height:42}} disabled={metadataDisabled} />
                                    {help(a.primaryColorHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.secondaryColor}</span>
                                    <input type="color" value={teamColorSecondary} onChange={e=>setTeamColorSecondary(e.target.value)} style={{...s.input,padding:4,height:42}} disabled={metadataDisabled} />
                                    {help(a.secondaryColorHelp)}
                                </label>
                            </div>
                            <button onClick={()=>requestConfirm(a.saveTeamMetadata,[`${a.team}: ${editTeamId}`,`${a.name}: ${teamName}`,`${a.code}: ${teamCode}`,`${a.group}: ${teamGroup}`],'setTeamMetadata',[BigInt(editTeamId),teamName.trim(),teamCode.trim(),teamGroup.trim(),teamColor,teamColorSecondary])}
                                disabled={metadataDisabled || !teamName.trim() || !teamCode.trim() || !teamGroup.trim()} style={s.btn(metadataDisabled?'#475569':'#14b8a6')}>{a.saveTeamMetadata}</button>
                            <div style={{marginTop:16}}>
                                <label><span style={s.lbl}>{a.batchCsv}</span>
                                    <textarea value={batchMetadata} onChange={e=>setBatchMetadata(e.target.value)} disabled={metadataDisabled}
                                        placeholder={"0,Brazil,BRA,A,#009c3b,#ffdf00\n1,France,FRA,A,#1d4ed8,#ef4444"}
                                        className="wc-admin-textarea" style={{...s.input,minHeight:110,borderRadius:12,resize:'vertical',fontFamily:'monospace'}} />
                                </label>
                                {help(a.batchCsvHelp)}
                                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                                    <button onClick={() => setBatchMetadata(getTeamMetadataCsv(wc.maxTeams || 48))} disabled={metadataDisabled} style={s.btn(metadataDisabled?'#475569':'#2563eb')}>{a.loadTemplate}</button>
                                    <button onClick={saveBatchMetadata} disabled={metadataDisabled || !batchMetadata.trim()} style={s.btn(metadataDisabled?'#475569':'#14b8a6')}>{a.saveBatch}</button>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Team Manager */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.teamManager}</h2>
                            <p className="wc-admin-section-desc">{a.teamManagerDesc}</p>
                            <div className="wc-admin-tools">
                                <input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder={a.searchTeam} style={s.input} />
                                <SelectMenu value={teamStatusFilter} options={teamStatusOptions} onChange={setTeamStatusFilter} className="wc-admin-select" />
                            </div>
                            <div className="wc-admin-table">
                                {filteredTeams.slice(0, 16).map(team => (
                                    <button key={team.id} type="button" onClick={() => setEditTeamId(team.id)}>
                                        <span className="wc-admin-color-dot" style={{background: team.color}} />
                                        <strong>{team.code}</strong>
                                        <span>{team.name}</span>
                                        <em>{team.group}</em>
                                        <small>{team.status}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: Operations & Match Workflow */}
                    <div className="wc-admin-column">
                        
                        {/* Section 1: Checklist & Health */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.checklist}</h2>
                            <div className="wc-admin-workflow" style={{marginBottom: 16}}>
                                {workflow.map((item, index) => (
                                    <div key={item.title} className={`wc-admin-workflow-item ${item.done ? 'done' : item.blocked ? 'blocked' : 'ready'}`}>
                                        <span>{index + 1}</span>
                                        <strong>{item.title}</strong>
                                        <em>{item.state}</em>
                                    </div>
                                ))}
                            </div>
                            <h2 style={{fontSize:16,marginTop:0}}>{cleanLabel(t.statusOverview)}</h2>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:12,fontSize:13,background:'rgba(15,23,42,0.3)',padding:12,borderRadius:16,border:'1px solid rgba(255,255,255,0.04)'}}>
                                <div><span style={s.lbl}>{t.tournament}</span><strong>{cleanLabel(tournamentStarted ? t.live : t.pending)}</strong></div>
                                <div><span style={s.lbl}>{a.season}</span><strong>#{String(wc.seasonId || 1)}</strong></div>
                                <div><span style={s.lbl}>{a.teams}</span><strong>{String(wc.maxTeams || teams.length || 0)}</strong></div>
                                <div><span style={s.lbl}>{a.startTime}</span><strong>{wc.tournamentStartTime ? String(wc.tournamentStartTime) : '0'}</strong></div>
                                <div><span style={s.lbl}>{t.matchesPlayed}</span><strong>{String(matchCount||0)}</strong></div>
                                <div><span style={s.lbl}>{t.rewardPool}</span><strong>{rewardPool ? (Number(rewardPool)/1e18).toLocaleString() : '0'}</strong></div>
                                <div><span style={s.lbl}>{a.unclaimedRewards}</span><strong>{wc.totalUnclaimedRewards ? (Number(wc.totalUnclaimedRewards)/1e18).toLocaleString() : '0'}</strong></div>
                                <div><span style={s.lbl}>{a.lockedMatches}</span><strong>{String(wc.lockedMatchCount || 0)}</strong></div>
                                <div><span style={s.lbl}>{a.totalPrincipal}</span><strong>{wc.totalStakedAll ? Number(formatEther(wc.totalStakedAll)).toLocaleString(undefined,{maximumFractionDigits:2}) : '0'}</strong></div>
                                <div><span style={s.lbl}>{a.champion}</span><strong>{wc.tournamentEnded ? teamLabel(wc.championTeamId) : '-'}</strong></div>
                            </div>
                        </div>

                        {/* Section 2: Match Scheduler */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.matchScheduler}</h2>
                            <p className="wc-admin-section-desc">{a.schedulerDesc}</p>
                            <div className="wc-admin-tools">
                                <input value={scheduleRound} onChange={e=>setScheduleRound(e.target.value)} placeholder={a.round} style={s.input} />
                                <input value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} placeholder={a.plannedTime} style={s.input} />
                                <button type="button" onClick={addScheduledMatch} disabled={teamA === teamB} style={s.btn('#2563eb')}>{a.addSchedule}</button>
                            </div>
                            <div className="wc-admin-list">
                                {scheduledMatches.length === 0 ? <span>{a.noScheduled}</span> : scheduledMatches.map(row => (
                                    <div key={row.id}>
                                        <strong>{row.round}</strong>
                                        <span>{teamLabel(row.teamA)} vs {teamLabel(row.teamB)} · {row.time || '-'}</span>
                                        <button type="button" onClick={() => { setTeamA(row.teamA); setTeamB(row.teamB); setIsElim(row.elimination); }}>{a.useMatch}</button>
                                        <button type="button" onClick={() => setScheduledMatches(rows => rows.filter(item => item.id !== row.id))}>{a.remove}</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Match Queue */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.matchQueue}</h2>
                            <p className="wc-admin-section-desc">{a.matchQueueDesc}</p>
                            <label className="wc-admin-checkbox" style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,fontSize:14}}>
                                <input type="checkbox" checked={queueLockedOnly} onChange={e=>setQueueLockedOnly(e.target.checked)} /> {a.lockedOnlyQueue}
                            </label>
                            <div className="wc-admin-list">
                                {visibleMatches.length === 0 ? <span>{a.noMatches}</span> : visibleMatches.map(row => (
                                    <div key={row.id}>
                                        <strong>#{row.id}</strong>
                                        <span>{teamLabel(row.teamA)} vs {teamLabel(row.teamB)} · {row.resolved ? (row.draw ? a.draw : a.resolved) : row.locked ? t.locked : a.open}</span>
                                        <button type="button" onClick={() => { setMatchId(row.id); setInspectMatchId(row.id); setWinnerId(row.teamA); }}>{a.useMatch}</button>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>

                    {/* COLUMN 3: Safety & Financial System */}
                    <div className="wc-admin-column">
                        
                        {/* Section 1: Live Contract Info */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{t.liveContract}</h2>
                            <div style={{display:'grid',gap:10}}>
                                <div style={{display:'grid',gridTemplateColumns:'90px 1fr auto',gap:10,alignItems:'center'}}>
                                    <span style={s.lbl}>{a.contract}</span>
                                    <code style={{color:'#e2e8f0',wordBreak:'break-all',fontSize:12}}>{WORLDCUP_CONTRACT_ADDRESS}</code>
                                    <a href={contractExplorerUrl} target="_blank" rel="noreferrer" style={{color:'#34d399',display:'inline-flex',gap:4,alignItems:'center',fontSize:12}}>OKX <ExternalLink size={12}/></a>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:10,alignItems:'center'}}>
                                    <span style={s.lbl}>{a.owner}</span>
                                    <code style={{color:'#e2e8f0',wordBreak:'break-all',fontSize:12}}>{ownerAddress}</code>
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'90px 1fr auto',gap:10,alignItems:'center'}}>
                                    <span style={s.lbl}>{a.stakingToken}</span>
                                    <code style={{color:'#e2e8f0',wordBreak:'break-all',fontSize:12}}>{typeof stakingToken === 'string' ? stakingToken : '-'}</code>
                                    {tokenExplorerUrl && <a href={tokenExplorerUrl} target="_blank" rel="noreferrer" style={{color:'#34d399',display:'inline-flex',gap:4,alignItems:'center',fontSize:12}}>OKX <ExternalLink size={12}/></a>}
                                </div>
                                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                                    <span style={{padding:'4px 8px',borderRadius:999,background:'rgba(20,184,166,0.12)',color:'#5eead4',fontSize:11}}>{a.connectedOwner}</span>
                                    <span style={{padding:'4px 8px',borderRadius:999,background:'rgba(20,184,166,0.12)',color:'#5eead4',fontSize:11}}>Chain {XLAYER_CHAIN_ID}</span>
                                    <span style={{padding:'4px 8px',borderRadius:999,background:paused?'rgba(239,68,68,0.12)':'rgba(16,185,129,0.12)',color:paused?'#f87171':'#34d399',fontSize:11}}>{paused ? a.paused : a.running}</span>
                                    <span style={{padding:'4px 8px',borderRadius:999,background:'rgba(148,163,184,0.12)',color:'#cbd5e1',fontSize:11}}>{a.oracleMode}: {a.manualTestnet}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Realtime Health Check */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.health}</h2>
                            <p className="wc-admin-section-desc">{a.healthDesc}</p>
                            <div className="wc-admin-health">
                                {[
                                    { label: a.contract, ok: isContractConfigured },
                                    { label: 'Owner gate', ok: isOwner },
                                    { label: `Chain ${XLAYER_CHAIN_ID}`, ok: connectedChainId === XLAYER_CHAIN_ID },
                                    { label: a.running, ok: !paused },
                                    { label: a.lockedMatches, ok: wc.lockedMatchCount === 0 },
                                    { label: a.unclaimedRewards, ok: (wc.totalUnclaimedRewards || BigInt(0)) === BigInt(0) || !!tournamentStarted },
                                ].map(item => (
                                    <span key={item.label} className={item.ok ? 'ok' : 'warn'}>{item.label}</span>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Preflight Validation */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.preflight}</h2>
                            <div className="wc-admin-validation">
                                {validationItems.map(item => (
                                    <span key={item.text} className={item.ok ? 'ok' : 'warn'}>{item.ok ? a.validationPassed : a.warning}: {item.text}</span>
                                ))}
                            </div>
                        </div>

                        {/* Section 4: Finance Controls */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.financeControls}</h2>
                            <p className="wc-admin-section-desc">{a.financeHelp}</p>
                            <div style={s.row}>
                                <label style={s.label}><span style={s.lbl}>{a.stakeFee}</span>
                                    <input type="number" value={stakeFeeInput} onChange={e=>setStakeFeeInput(e.target.value)} min={0} max={10} step="0.01" style={s.input} />
                                    {help(a.stakeFeeHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.unstakeFee}</span>
                                    <input type="number" value={unstakeFeeInput} onChange={e=>setUnstakeFeeInput(e.target.value)} min={0} max={10} step="0.01" style={s.input} />
                                    {help(a.unstakeFeeHelp)}
                                </label>
                            </div>
                            <button onClick={()=>requestConfirm(a.saveFees,[`${a.stakeFee}: ${stakeFeeInput}%`,`${a.unstakeFee}: ${unstakeFeeInput}%`],'setFees',[BigInt(Math.round(Number(stakeFeeInput || 0) * 100)),BigInt(Math.round(Number(unstakeFeeInput || 0) * 100))])}
                                disabled={loading || Number(stakeFeeInput) > 10 || Number(unstakeFeeInput) > 10} style={s.btn('#0f766e')}>{a.saveFees}</button>
                            <div style={{...s.row,marginTop:12}}>
                                <label style={s.label}><span style={s.lbl}>{a.minStake}</span>
                                    <input type="number" value={minStakeInput} onChange={e=>setMinStakeInput(e.target.value)} min={0} step="0.01" style={s.input} />
                                    {help(a.minStakeHelp)}
                                </label>
                                <div style={{display:'flex',alignItems:'flex-end'}}>
                                    <button onClick={()=>requestConfirm(a.saveMinStake,[`${a.minStake}: ${minStakeInput}`],'setMinStakeAmount',[parseEther(minStakeInput || '0')])} disabled={loading || Number(minStakeInput) <= 0} style={s.btn('#0f766e')}>{a.saveMinStake}</button>
                                </div>
                            </div>
                            <div style={{...s.row,marginTop:12}}>
                                <label style={s.label}><span style={s.lbl}>{a.rewardWithdrawTo}</span>
                                    <input value={withdrawTo} onChange={e=>setWithdrawTo(e.target.value)} placeholder="0x..." style={s.input} />
                                    {help(a.rewardWithdrawHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.amount}</span>
                                    <input type="number" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} min={0} step="0.01" style={s.input} />
                                    {help(a.rewardAmountHelp)}
                                </label>
                            </div>
                            <button onClick={()=>requestConfirm(a.withdrawRewardPool,[`${a.rewardWithdrawTo}: ${withdrawTo}`,`${a.amount}: ${withdrawAmount}`],'withdrawRewardPool',[withdrawTo,parseEther(withdrawAmount || '0')])}
                                disabled={loading || !isAddress(withdrawTo) || Number(withdrawAmount) <= 0} style={s.btn('#a16207')}>{a.withdrawRewardPool}</button>
                            <div style={{...s.row,marginTop:12}}>
                                <label style={s.label}><span style={s.lbl}>{a.recoverToken}</span>
                                    <input value={recoverToken} onChange={e=>setRecoverToken(e.target.value)} placeholder="0x..." style={s.input} />
                                    {help(a.recoverTokenHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.recoverTo}</span>
                                    <input value={recoverTo} onChange={e=>setRecoverTo(e.target.value)} placeholder="0x..." style={s.input} />
                                    {help(a.recoverToHelp)}
                                </label>
                                <label style={s.label}><span style={s.lbl}>{a.amount}</span>
                                    <input type="number" value={recoverAmount} onChange={e=>setRecoverAmount(e.target.value)} min={0} step="0.01" style={s.input} />
                                    {help(a.recoverAmountHelp)}
                                </label>
                            </div>
                            <button onClick={()=>requestConfirm(a.recoverErc20,[`${a.recoverToken}: ${recoverToken}`,`${a.recoverTo}: ${recoverTo}`,`${a.amount}: ${recoverAmount}`,a.recoverTokenHelp],'recoverERC20',[recoverToken,recoverTo,parseEther(recoverAmount || '0')])}
                                disabled={loading || !isAddress(recoverToken) || !isAddress(recoverTo) || Number(recoverAmount) <= 0} style={s.btn('#7f1d1d')}>{a.recoverErc20}</button>
                        </div>

                        {/* Section 5: Emergency Controls */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0,display:'flex',alignItems:'center',gap:8}}><AlertTriangle size={17} />{t.emergency}</h2>
                            <p className="wc-admin-section-desc">{a.emergencyHelp}</p>
                            <div style={{display:'flex',gap:8}}>
                                <button onClick={()=>requestConfirm(cleanLabel(t.pause),[a.emergencyHelp],'pause',[])} style={s.btn('#ef4444')}><Pause size={15} /> {cleanLabel(t.pause)}</button>
                                <button onClick={()=>requestConfirm(cleanLabel(t.unpause),[a.emergencyHelp],'unpause',[])} style={s.btn('#3b82f6')}><Play size={15} /> {cleanLabel(t.unpause)}</button>
                            </div>
                        </div>

                        {/* Section 6: Activity Log & Archive */}
                        <div className="wc-admin-grid-2">
                            <div style={s.section}>
                                <h2 style={{fontSize:16,marginTop:0}}>{a.activity}</h2>
                                <p className="wc-admin-section-desc">{a.activityDesc}</p>
                                <div className="wc-admin-list">
                                    {activityLog.length === 0 && allMatches.length === 0 ? <span>{a.noMatches}</span> : (
                                        <>
                                            {activityLog.map((line, i) => <div key={`log-${i}`}><strong>Local</strong><span>{line}</span></div>)}
                                            {allMatches.slice(0, 4).map(row => (
                                                <div key={`match-log-${row.id}`}>
                                                    <strong>M #{row.id}</strong>
                                                    <span>{teamLabel(row.teamA)} vs {teamLabel(row.teamB)} · {row.resolved ? row.draw ? a.draw : a.resolved : row.locked ? t.locked : a.open}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={s.section}>
                                <h2 style={{fontSize:16,marginTop:0}}>{a.seasonArchive}</h2>
                                <p className="wc-admin-section-desc">{a.archiveDesc}</p>
                                <div className="wc-admin-health">
                                    <span className="ok">{a.season} #{String(wc.seasonId || 1)}</span>
                                    <span className={wc.tournamentEnded ? 'ok' : 'warn'}>{wc.tournamentEnded ? a.done : cleanLabel(t.pending)}</span>
                                    <span className="ok">{a.teams}: {String(wc.maxTeams || teams.length || 0)}</span>
                                    <span className="ok">{a.champion}: {wc.tournamentEnded ? teamLabel(wc.championTeamId) : '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 7: Roles */}
                        <div style={s.section}>
                            <h2 style={{fontSize:16,marginTop:0}}>{a.roles}</h2>
                            <p className="wc-admin-section-desc">{a.rolesDesc}</p>
                            <div className="wc-admin-role-grid">
                                <div><strong>{a.roleOwner}</strong><span>{a.activeRole}</span><small style={{wordBreak:'break-all'}}>{ownerAddress}</small></div>
                                <div><strong>{a.roleOperator}</strong><span>{a.futureRole}</span><small>{t.lockMatch}, {t.resolveMatch}, {a.resolveDraw}</small></div>
                                <div><strong>{a.roleTreasurer}</strong><span>{a.futureRole}</span><small>{a.withdrawRewardPool}, {a.recoverErc20}</small></div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
            {confirmAction && (
                <div className="wc-admin-confirm-backdrop" role="dialog" aria-modal="true">
                    <div className="wc-admin-confirm">
                        <h2>{a.confirmTitle}</h2>
                        <p>{a.confirmDesc}</p>
                        <h3>{confirmAction.title}</h3>
                        <ul>
                            {confirmAction.details.map(item => <li key={item}>{item}</li>)}
                        </ul>
                        <div>
                            <button type="button" onClick={() => setConfirmAction(null)}>{a.cancel}</button>
                            <button type="button" onClick={confirmExec}>{a.confirm}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---- Mascot Manager (admin-only) ---- */
function MascotManager({ teams }: { teams: Array<{ id: number; code: string; name: string }> }) {
    const [mascotCodes, setMascotCodes] = React.useState<string[]>([]);
    const [uploading, setUploading] = React.useState<string | null>(null);
    const [msg, setMsg] = React.useState('');

    const fetchMascots = React.useCallback(async () => {
        try {
            const res = await fetch('/api/mascots');
            const data = await res.json();
            setMascotCodes(data.files || []);
        } catch {}
    }, []);

    React.useEffect(() => { fetchMascots(); }, [fetchMascots]);

    const handleUpload = async (code: string, file: File) => {
        setUploading(code);
        setMsg('');
        try {
            const form = new FormData();
            form.append('code', code);
            form.append('file', file);
            const res = await fetch('/api/mascots', { method: 'POST', body: form });
            const data = await res.json();
            if (data.ok) {
                setMsg(`${code} uploaded`);
                fetchMascots();
            } else {
                setMsg(`Error: ${data.error}`);
            }
        } catch (err) {
            setMsg(`Error: ${err}`);
        }
        setUploading(null);
    };

    const handleDelete = async (code: string) => {
        if (!confirm(`Remove mascot for ${code}?`)) return;
        try {
            await fetch('/api/mascots', { method: 'DELETE', body: JSON.stringify({ code }), headers: { 'Content-Type': 'application/json' } });
            setMsg(`${code} removed`);
            fetchMascots();
        } catch {}
    };

    const hasMascot = (code: string) => mascotCodes.includes(code.slice(0, 3).toUpperCase());
    const coverage = teams.filter(t => hasMascot(t.code)).length;

    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: 16, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                🐱 Mascot Manager
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{coverage}/{teams.length} teams</span>
            </h2>
            <p className="wc-admin-section-desc">
                Upload or replace Banana Cat mascot images for each team. Images are served from <code style={{ color: '#14b8a6' }}>public/mascots/&#123;CODE&#125;.png</code>. Teams without a mascot image will use the default CSS crest.
            </p>
            {msg && <div style={{ padding: '8px 12px', borderRadius: 8, background: msg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: msg.startsWith('Error') ? '#f87171' : '#34d399', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {teams.map(team => {
                    const code = team.code.slice(0, 3).toUpperCase();
                    const has = hasMascot(team.code);
                    const isUploading = uploading === code;
                    return (
                        <div key={team.id} style={{
                            position: 'relative',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            padding: 10, borderRadius: 12,
                            background: has ? 'rgba(16,185,129,0.06)' : 'rgba(148,163,184,0.06)',
                            border: `1px solid ${has ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.1)'}`,
                        }}>
                            <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: 'rgba(2,6,23,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {has ? (
                                    <img src={`/mascots/${code}.png`} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <span style={{ fontSize: 14, fontWeight: 900, color: '#475569' }}>{code}</span>
                                )}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.2 }}>{team.name}</span>
                            <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                                <label style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '4px 0', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer',
                                    background: isUploading ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)', color: isUploading ? '#fbbf24' : '#34d399',
                                }}>
                                    {isUploading ? '...' : has ? '↻' : '↑'}
                                    <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(code, f); e.target.value = ''; }} />
                                </label>
                                {has && (
                                    <button onClick={() => handleDelete(code)} style={{
                                        flex: 0, padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                        background: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'none', cursor: 'pointer',
                                    }}>✕</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
