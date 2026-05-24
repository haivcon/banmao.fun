"use client";
import { useAccount, useBalance, useBlockNumber, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { useMemo, useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WORLDCUP_CONTRACT_ADDRESS, WORLDCUP_ABI, ERC20_ABI, BANMAO_TOKEN_ADDRESS, XLAYER_CHAIN_ID } from "../contracts";
import { TEAMS, getDefaultTeamInfo, getTeamStatus, type TeamInfo, type TeamStatus } from "../lib/teamData";
import { useWCLang } from "../lib/i18n";

const CONTRACT = { address: WORLDCUP_CONTRACT_ADDRESS, abi: WORLDCUP_ABI, chainId: XLAYER_CHAIN_ID } as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface SeasonData {
    seasonId: number;
    maxTeams: number;
    tournamentStartTime?: bigint;
    totalStakedAll: bigint;
    totalUnclaimedRewards: bigint;
    lockedMatchCount: number;
    championTeamId: number;
    tournamentStarted: boolean;
    tournamentEnded: boolean;
}

export interface TeamPoolData {
    id: number;
    name: string;
    code: string;
    color: string;
    colorSecondary: string;
    group: string;
    totalPrincipal: bigint;
    totalWeight: bigint;
    accRewardPerWeight: bigint;
    principalIndex: bigint;
    totalStaked: bigint;
    status: TeamStatus;
    statusCode: number;
    locked: boolean;
    tvlFormatted: string;
}

export interface MatchData {
    matchId: number;
    seasonId: number;
    teamA: number;
    teamB: number;
    winningTeam: number;
    isLocked: boolean;
    isResolved: boolean;
    isElimination: boolean;
    isDraw: boolean;
    slashedAmount: bigint;
    feeBonus: bigint;
}

export interface MatchRewardBreakdown {
    seasonId: number;
    teamA: number;
    teamB: number;
    winningTeam: number;
    losingTeam: number;
    isResolved: boolean;
    isDraw: boolean;
    slashedAmount: bigint;
    feeBonus: bigint;
    totalReward: bigint;
    winningPoolWeight: bigint;
    rewardToWinners: boolean;
}

export interface UserTeamInfo {
    amount: bigint;
    principal: bigint;
    weight: bigint;
    pendingRewards: bigint;
}

function parseSeason(raw: unknown, seasonId: number): SeasonData {
    const [
        maxTeams,
        tournamentStartTime,
        totalStakedAll,
        totalUnclaimedRewards,
        lockedMatchCount,
        championTeamId,
        tournamentStarted,
        tournamentEnded,
    ] = (raw || []) as [bigint?, bigint?, bigint?, bigint?, bigint?, bigint?, boolean?, boolean?];
    return {
        seasonId,
        maxTeams: Number(maxTeams || 0),
        tournamentStartTime,
        totalStakedAll: totalStakedAll || BigInt(0),
        totalUnclaimedRewards: totalUnclaimedRewards || BigInt(0),
        lockedMatchCount: Number(lockedMatchCount || 0),
        championTeamId: Number(championTeamId || 0),
        tournamentStarted: !!tournamentStarted,
        tournamentEnded: !!tournamentEnded,
    };
}

export function useWorldCup() {
    const { address } = useAccount();
    const { t } = useWCLang();
    const queryClient = useQueryClient();
    const [selectedSeasonId, setSelectedSeasonId] = useState<number | undefined>(undefined);
    const { data: blockNumber } = useBlockNumber({
        chainId: XLAYER_CHAIN_ID,
        watch: true,
        query: { refetchInterval: 4000 },
    });

    const refreshOnchainReads = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['readContract'] });
        void queryClient.invalidateQueries({ queryKey: ['readContracts'] });
        void queryClient.invalidateQueries({ queryKey: ['balance'] });
    }, [queryClient]);

    const { data: currentSeasonRaw } = useReadContract({ ...CONTRACT, functionName: 'currentSeasonId', query: { refetchInterval: 10000 } });
    const currentSeasonId = Number(currentSeasonRaw || 1);
    const effectiveSeasonId = selectedSeasonId || currentSeasonId || 1;
    const isCurrentSeason = effectiveSeasonId === currentSeasonId;

    const { data: selectedSeasonRaw } = useReadContract({
        ...CONTRACT,
        functionName: 'getSeasonInfo',
        args: [BigInt(effectiveSeasonId)],
        query: { enabled: effectiveSeasonId > 0, refetchInterval: 10000 },
    });

    const seasonContracts = useMemo(() => Array.from({ length: Math.max(0, currentSeasonId) }, (_, i) => ({
        ...CONTRACT,
        functionName: 'getSeasonInfo' as const,
        args: [BigInt(i + 1)] as const,
    })), [currentSeasonId]);
    const { data: seasonInfosRaw } = useReadContracts({
        contracts: seasonContracts as any,
        query: { enabled: currentSeasonId > 0, refetchInterval: 15000 },
    });

    const seasonOptions = useMemo(() => {
        if (!seasonInfosRaw) return Array.from({ length: currentSeasonId || 1 }, (_, i) => parseSeason(undefined, i + 1));
        return seasonInfosRaw.map((r, i) => parseSeason(r.status === 'success' ? r.result : undefined, i + 1));
    }, [seasonInfosRaw, currentSeasonId]);

    const season = useMemo(() => parseSeason(selectedSeasonRaw, effectiveSeasonId), [selectedSeasonRaw, effectiveSeasonId]);

    const { data: rewardPool } = useReadContract({ ...CONTRACT, functionName: 'rewardPool', query: { refetchInterval: 15000 } });
    const { data: matchCount } = useReadContract({ ...CONTRACT, functionName: 'matchCount', query: { refetchInterval: 10000 } });
    const { data: paused } = useReadContract({ ...CONTRACT, functionName: 'paused', query: { refetchInterval: 10000 } });
    const { data: minStakeAmount } = useReadContract({ ...CONTRACT, functionName: 'minStakeAmount', query: { refetchInterval: 15000 } });
    const { data: stakeFee } = useReadContract({ ...CONTRACT, functionName: 'stakeFee', query: { refetchInterval: 15000 } });
    const { data: unstakeFee } = useReadContract({ ...CONTRACT, functionName: 'unstakeFee', query: { refetchInterval: 15000 } });
    const { data: stakingTokenAddressRaw } = useReadContract({ ...CONTRACT, functionName: 'stakingToken', query: { refetchInterval: 15000 } });
    const { data: seasonMatchIdsRaw } = useReadContract({
        ...CONTRACT,
        functionName: 'getSeasonMatchIds',
        args: [BigInt(effectiveSeasonId)],
        query: { enabled: effectiveSeasonId > 0, refetchInterval: 10000 },
    });

    const seasonMatchIds = useMemo(() => (seasonMatchIdsRaw as bigint[] | undefined || []).map(Number), [seasonMatchIdsRaw]);
    const latestSeasonMatchId = seasonMatchIds.length > 0 ? seasonMatchIds[seasonMatchIds.length - 1] : 0;
    const { data: latestMatchRaw } = useReadContract({
        ...CONTRACT,
        functionName: 'getMatch',
        args: [BigInt(latestSeasonMatchId)],
        query: { enabled: seasonMatchIds.length > 0, refetchInterval: 8000 },
    });
    const { data: latestMatchBreakdownRaw } = useReadContract({
        ...CONTRACT,
        functionName: 'getMatchRewardBreakdown',
        args: [BigInt(latestSeasonMatchId)],
        query: { enabled: seasonMatchIds.length > 0, retry: 1, refetchInterval: 8000 },
    });

    const stakingTokenAddress = (
        typeof stakingTokenAddressRaw === 'string' && stakingTokenAddressRaw.toLowerCase() !== ZERO_ADDRESS
            ? stakingTokenAddressRaw
            : BANMAO_TOKEN_ADDRESS
    ) as `0x${string}`;
    const tokenContract = useMemo(() => ({
        address: stakingTokenAddress,
        abi: ERC20_ABI,
        chainId: XLAYER_CHAIN_ID,
    }) as const, [stakingTokenAddress]);

    const { data: allStats } = useReadContract({
        ...CONTRACT,
        functionName: 'getAllTeamStats',
        args: [BigInt(effectiveSeasonId)],
        query: { enabled: effectiveSeasonId > 0, refetchInterval: 12000 },
    });
    const { data: allMetadata } = useReadContract({
        ...CONTRACT,
        functionName: 'getAllTeamMetadata',
        args: [BigInt(effectiveSeasonId)],
        query: { enabled: effectiveSeasonId > 0, refetchInterval: 12000 },
    });

    const teams: TeamInfo[] = useMemo(() => {
        const count = season.maxTeams || TEAMS.length;
        const safeCount = Number.isFinite(count) && count > 0 ? count : TEAMS.length;
        const fallbackTeams = Array.from({ length: safeCount }, (_, id) => getDefaultTeamInfo(id));
        if (!allMetadata) {
            return fallbackTeams.map(team => ({ ...team, name: t.countries?.[team.name] || team.name }));
        }

        const [names, codes, groupNames, colors, colorSecondaries] = allMetadata as unknown as [string[], string[], string[], string[], string[]];
        return fallbackTeams.map((fallback, id) => {
            const rawName = names?.[id] || fallback.name;
            return {
                id,
                name: t.countries?.[rawName] || rawName,
                code: codes?.[id] || fallback.code,
                group: groupNames?.[id] || fallback.group,
                color: colors?.[id] || fallback.color,
                colorSecondary: colorSecondaries?.[id] || fallback.colorSecondary,
            };
        });
    }, [season.maxTeams, allMetadata, t.countries]);

    const teamPools: TeamPoolData[] = useMemo(() => {
        if (!allStats) {
            return teams.map(t => ({
                ...t,
                totalStaked: BigInt(0),
                status: 'active' as TeamStatus,
                totalPrincipal: BigInt(0),
                totalWeight: BigInt(0),
                accRewardPerWeight: BigInt(0),
                principalIndex: BigInt("1000000000000000000"),
                statusCode: 0,
                locked: false,
                tvlFormatted: '0',
            }));
        }
        const [principalArr, weightArr, accRewardArr, indexArr, statusArr, lockedArr] = allStats as unknown as [bigint[], bigint[], bigint[], bigint[], number[], boolean[]];
        return teams.map((t, i) => {
            const totalPrincipal = principalArr[i] || BigInt(0);
            const totalWeight = weightArr[i] || BigInt(0);
            const statusCode = Number(statusArr[i] || 0);
            const locked = lockedArr[i] || false;
            return {
                ...t,
                totalPrincipal,
                totalWeight,
                accRewardPerWeight: accRewardArr[i] || BigInt(0),
                principalIndex: indexArr[i] || BigInt("1000000000000000000"),
                totalStaked: totalPrincipal,
                status: getTeamStatus(statusCode, locked),
                statusCode,
                locked,
                tvlFormatted: Number(formatEther(totalPrincipal)).toLocaleString(undefined, { maximumFractionDigits: 0 }),
            };
        });
    }, [allStats, teams]);

    const parseMatch = useCallback((raw: unknown, id: number): MatchData | null => {
        if (!raw) return null;
        const [seasonId, teamA, teamB, winningTeam, isLocked, isResolved, isElimination, isDraw, slashedAmount, feeBonus] =
            raw as [bigint, bigint, bigint, bigint, boolean, boolean, boolean, boolean, bigint, bigint];
        return {
            matchId: id,
            seasonId: Number(seasonId),
            teamA: Number(teamA),
            teamB: Number(teamB),
            winningTeam: Number(winningTeam),
            isLocked,
            isResolved,
            isElimination,
            isDraw,
            slashedAmount,
            feeBonus,
        };
    }, []);

    const latestMatch = useMemo(() => parseMatch(latestMatchRaw, latestSeasonMatchId), [latestMatchRaw, latestSeasonMatchId, parseMatch]);

    const latestMatchBreakdown: MatchRewardBreakdown | null = useMemo(() => {
        if (!latestMatchBreakdownRaw) return null;
        const [seasonId, teamA, teamB, winningTeam, losingTeam, isResolved, isDraw, slashedAmount, feeBonus, totalReward, winningPoolWeight, rewardToWinners] =
            latestMatchBreakdownRaw as unknown as [bigint, bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint, bigint, bigint, boolean];
        return {
            seasonId: Number(seasonId),
            teamA: Number(teamA),
            teamB: Number(teamB),
            winningTeam: Number(winningTeam),
            losingTeam: Number(losingTeam),
            isResolved,
            isDraw,
            slashedAmount,
            feeBonus,
            totalReward,
            winningPoolWeight,
            rewardToWinners,
        };
    }, [latestMatchBreakdownRaw]);

    const { data: tokenBalance, error: tokenBalanceError, isLoading: tokenBalanceLoading } = useReadContract({
        ...tokenContract,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 5000 },
    });
    const { data: nativeBalance } = useBalance({
        address,
        chainId: XLAYER_CHAIN_ID,
        query: { enabled: !!address, refetchInterval: 5000 },
    });
    const { data: allowance } = useReadContract({
        ...tokenContract,
        functionName: 'allowance',
        args: address ? [address, WORLDCUP_CONTRACT_ADDRESS] : undefined,
        query: { enabled: !!address, refetchInterval: 5000 },
    });

    const userStakeContracts = useMemo(() => {
        if (!address) return [];
        return teams.map(t => ({
            ...CONTRACT,
            functionName: 'getUserInfo' as const,
            args: [BigInt(effectiveSeasonId), address, BigInt(t.id)] as const,
        }));
    }, [address, teams, effectiveSeasonId]);
    const { data: userStakesRaw } = useReadContracts({
        contracts: userStakeContracts as any,
        query: { enabled: !!address && effectiveSeasonId > 0, refetchInterval: 5000 },
    });

    const userStakes = useMemo(() => {
        if (!userStakesRaw) return teams.map(() => ({ amount: BigInt(0), principal: BigInt(0), weight: BigInt(0), pendingRewards: BigInt(0) }));
        return userStakesRaw.map(r => {
            if (r.status !== 'success' || !r.result) return { amount: BigInt(0), principal: BigInt(0), weight: BigInt(0), pendingRewards: BigInt(0) };
            const [principal, weight, pendingRewards] = r.result as unknown as [bigint, bigint, bigint];
            return { amount: principal, principal, weight, pendingRewards };
        });
    }, [userStakesRaw, teams]);

    const matchContracts = useMemo(() => seasonMatchIds.map(id => ({
        ...CONTRACT,
        functionName: 'getMatch' as const,
        args: [BigInt(id)] as const,
    })), [seasonMatchIds]);
    const { data: matchesRaw } = useReadContracts({
        contracts: matchContracts as any,
        query: { enabled: seasonMatchIds.length > 0, refetchInterval: 12000 },
    });
    const matchBreakdownContracts = useMemo(() => seasonMatchIds.map(id => ({
        ...CONTRACT,
        functionName: 'getMatchRewardBreakdown' as const,
        args: [BigInt(id)] as const,
    })), [seasonMatchIds]);
    const { data: matchBreakdownsRaw } = useReadContracts({
        contracts: matchBreakdownContracts as any,
        query: { enabled: seasonMatchIds.length > 0, retry: 1, refetchInterval: 12000 },
    });

    const allMatches = useMemo(() => {
        if (!matchesRaw) return [];
        return matchesRaw.map((r, idx) => r.status === 'success' ? parseMatch(r.result, seasonMatchIds[idx]) : null).filter(Boolean) as MatchData[];
    }, [matchesRaw, seasonMatchIds, parseMatch]);

    const allMatchBreakdowns: Array<MatchRewardBreakdown | null> = useMemo(() => {
        if (!matchBreakdownsRaw) return [];
        return matchBreakdownsRaw.map(r => {
            if (r.status !== 'success' || !r.result) return null;
            const [seasonId, teamA, teamB, winningTeam, losingTeam, isResolved, isDraw, slashedAmount, feeBonus, totalReward, winningPoolWeight, rewardToWinners] =
                r.result as unknown as [bigint, bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint, bigint, bigint, boolean];
            return {
                seasonId: Number(seasonId),
                teamA: Number(teamA),
                teamB: Number(teamB),
                winningTeam: Number(winningTeam),
                losingTeam: Number(losingTeam),
                isResolved,
                isDraw,
                slashedAmount,
                feeBonus,
                totalReward,
                winningPoolWeight,
                rewardToWinners,
            };
        });
    }, [matchBreakdownsRaw]);

    const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: txSuccess, error: confirmError } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (txSuccess) {
            refreshOnchainReads();
            const timers = [
                window.setTimeout(refreshOnchainReads, 1200),
                window.setTimeout(refreshOnchainReads, 3500),
            ];
            return () => timers.forEach(window.clearTimeout);
        }
        return undefined;
    }, [txSuccess, refreshOnchainReads]);

    useEffect(() => {
        if (blockNumber) refreshOnchainReads();
    }, [blockNumber, refreshOnchainReads]);

    const approve = (amount: bigint) => writeContract({
        ...tokenContract,
        functionName: 'approve',
        args: [WORLDCUP_CONTRACT_ADDRESS, amount],
    } as any);
    const stakeToTeam = (teamId: number, amount: bigint) => writeContract({
        ...CONTRACT,
        functionName: 'stake',
        args: [BigInt(teamId), amount],
    } as any);
    const unstakeFromTeam = (teamId: number, amount: bigint, seasonOverride?: number) => writeContract({
        ...CONTRACT,
        functionName: 'unstake',
        args: [BigInt(seasonOverride || effectiveSeasonId), BigInt(teamId), amount],
    } as any);
    const claimRewards = (teamId: number, seasonOverride?: number) => writeContract({
        ...CONTRACT,
        functionName: 'claimRewards',
        args: [BigInt(seasonOverride || effectiveSeasonId), BigInt(teamId)],
    } as any);

    return {
        currentSeasonId,
        selectedSeasonId: effectiveSeasonId,
        setSelectedSeasonId,
        season,
        seasonOptions,
        isCurrentSeason,
        totalStakedAll: season.totalStakedAll,
        rewardPool: rewardPool as bigint | undefined,
        totalUnclaimedRewards: season.totalUnclaimedRewards,
        matchCount: seasonMatchIds.length,
        globalMatchCount: Number(matchCount || 0),
        lockedMatchCount: season.lockedMatchCount,
        tournamentStarted: season.tournamentStarted,
        tournamentEnded: season.tournamentEnded,
        paused: !!paused,
        championTeamId: season.championTeamId,
        seasonId: effectiveSeasonId,
        tournamentStartTime: season.tournamentStartTime,
        minStakeAmount: minStakeAmount as bigint | undefined,
        stakeFee: stakeFee as bigint | undefined,
        unstakeFee: unstakeFee as bigint | undefined,
        stakingTokenAddress,
        envTokenAddress: BANMAO_TOKEN_ADDRESS,
        maxTeams: season.maxTeams || teams.length,
        teams,
        teamPools,
        latestMatch,
        latestMatchBreakdown,
        allMatches,
        allMatchBreakdowns,
        walletAddress: address,
        tokenBalance: tokenBalance as bigint | undefined,
        tokenBalanceError,
        tokenBalanceLoading,
        nativeBalance,
        allowance: allowance as bigint | undefined,
        userStakes,
        approve,
        stakeToTeam,
        unstakeFromTeam,
        claimRewards,
        txHash,
        isPending,
        isConfirming,
        txSuccess,
        txError: txError || confirmError,
    };
}
