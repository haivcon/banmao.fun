
// Utility for grouping spin history items by transaction hash
// This helps identify multi-spin sessions

export interface GroupedSpinHistory {
    id: string;
    isMulti: boolean;
    count: number;
    txHash: string;
    timestamp: number;
    totalBet: bigint;
    totalPayout: bigint;
    multiplier: number;
    items: any[];
    poolId?: number;
    poolName?: string;
    player?: string;
    playerAddress?: string;
    playerName?: string;
    playerAvatar?: number;
    symbols?: string; // For single spins
    result?: number[]; // For single spins
    isJackpot?: boolean;
    seed?: string;
}

export const groupHistoryByTx = (history: any[]): GroupedSpinHistory[] => {
    if (!history || history.length === 0) return [];

    const txGroups: Record<string, any[]> = {};
    const groupedResults: GroupedSpinHistory[] = [];
    const nonTxItems: any[] = [];

    // Group items that have the same txHash
    history.forEach(item => {
        if (!item.txHash) {
            nonTxItems.push(item);
            return;
        }

        if (!txGroups[item.txHash]) {
            txGroups[item.txHash] = [];
        }
        txGroups[item.txHash].push(item);
    });

    // Process groups
    Object.keys(txGroups).forEach(txHash => {
        const items = txGroups[txHash];

        if (items.length > 1) {
            // Multi-spin session
            // Items are usually sorted by ID or timestamp, but within a TX they are fixed
            // We want to keep the order from the contract if possible
            const sortedItems = [...items].sort((a, b) => {
                // Try to use ID if it's numeric/sequential
                const idA = typeof a.id === 'string' ? parseInt(a.id) : a.id;
                const idB = typeof b.id === 'string' ? parseInt(b.id) : b.id;
                if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
                return 0;
            });

            const totalBet = items.reduce((sum, i) => sum + BigInt(i.betAmount || 0), BigInt(0));
            const totalPayout = items.reduce((sum, i) => sum + BigInt(i.payout || 0), BigInt(0));

            groupedResults.push({
                id: `multi-${txHash}`,
                isMulti: true,
                count: items.length,
                txHash,
                timestamp: items[0].timestamp,
                totalBet,
                totalPayout,
                multiplier: Number(totalBet) > 0 ? Number(totalPayout) / Number(totalBet) : 0,
                items: sortedItems,
                poolId: items[0].poolId,
                poolName: items[0].poolName,
                player: items[0].player,
                playerAddress: items[0].playerAddress,
                playerName: items[0].playerName,
                playerAvatar: items[0].playerAvatar
            });
        } else {
            // Single spin with a TX hash
            const item = items[0];
            groupedResults.push({
                ...item,
                isMulti: false,
                count: 1,
                totalBet: BigInt(item.betAmount || 0),
                totalPayout: BigInt(item.payout || 0),
                items: [item]
            });
        }
    });

    // Process items without TX hash
    nonTxItems.forEach(item => {
        groupedResults.push({
            ...item,
            isMulti: false,
            count: 1,
            totalBet: BigInt(item.betAmount || 0),
            totalPayout: BigInt(item.payout || 0),
            items: [item]
        });
    });

    // Final sort by timestamp descending
    return groupedResults.sort((a, b) => b.timestamp - a.timestamp);
};
