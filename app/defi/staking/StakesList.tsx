'use client';

import { useReadContract } from 'wagmi';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI } from './contracts';
import { StakeEntryCard, StakeEntrySkeleton } from './StakeEntryCard';

interface StakesListProps {
    address: `0x${string}` | undefined;
    stakeIds: bigint[];
    penalty: bigint;
    onUnstake: (stakeId: number) => void;
    onUnstakePartial: (stakeId: number, amount: string) => void;
    isLoading: boolean;
}

// Single stake item that fetches its own data
function StakeItem({
    address,
    stakeId,
    penalty,
    onUnstake,
    onUnstakePartial,
    isLoading,
}: {
    address: `0x${string}`;
    stakeId: bigint;
    penalty: bigint;
    onUnstake: (stakeId: number) => void;
    onUnstakePartial: (stakeId: number, amount: string) => void;
    isLoading: boolean;
}) {
    const { data: stakeData, isLoading: isLoadingData } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakeEntry',
        args: [address, stakeId],
        chainId: 196,
    });

    if (isLoadingData || !stakeData) {
        return <StakeEntrySkeleton />;
    }

    const [amount, shares, lockEndTime, startTime, lockOptionId, active, isLocked, inGracePeriod, estimatedPenalty] = stakeData;

    if (!active) {
        return null; // Don't render inactive stakes
    }

    return (
        <StakeEntryCard
            stakeId={Number(stakeId)}
            amount={amount}
            shares={shares}
            lockEndTime={lockEndTime}
            startTime={startTime}
            lockOptionId={lockOptionId}
            isLocked={isLocked}
            inGracePeriod={inGracePeriod}
            estimatedPenalty={estimatedPenalty}
            penalty={penalty}
            onUnstake={onUnstake}
            onUnstakePartial={onUnstakePartial}
            isLoading={isLoading}
        />
    );
}

export function StakesList({
    address,
    stakeIds,
    penalty,
    onUnstake,
    onUnstakePartial,
    isLoading,
}: StakesListProps) {
    if (!address || stakeIds.length === 0) {
        return (
            <div className="stakes-empty">
                <div className="emoji">📭</div>
                <p>You don&apos;t have any active stakes.</p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    Start staking to earn rewards!
                </p>
            </div>
        );
    }

    return (
        <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {stakeIds.map((id) => (
                <StakeItem
                    key={Number(id)}
                    address={address}
                    stakeId={id}
                    penalty={penalty}
                    onUnstake={onUnstake}
                    onUnstakePartial={onUnstakePartial}
                    isLoading={isLoading}
                />
            ))}
        </div>
    );
}
