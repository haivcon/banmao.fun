// Token Stats Context - Share API data across components
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useTokenStats, AdvancedInfo } from "../hooks/useTokenStats";

interface TokenStatsContextType {
    stats: {
        price: string;
        marketCap: string;
        liquidity: string;
        holders: string;
        circSupply: string;
        volume24H: string;
        volume1H: string;
        priceChange24H: string;
        priceChange1H: string;
    } | null;
    advancedInfo: AdvancedInfo | null;
    formattedStats: {
        marketCap: string;
        circSupply: string;
        holders: string;
        volume24H: string;
        volume1H: string;
        volume4H: string;
        priceChange24H: string;
        priceChange4H: string;
        liquidity: string;
        txs24H: string;
        tradeNum: string;
        maxPrice: string;
        minPrice: string;
        top10HoldPercent: string;
        lpBurnedPercent: string;
        riskLevel: string;
    };
    isLoading: boolean;
    isMock: boolean;
}

const TokenStatsContext = createContext<TokenStatsContextType>({
    stats: null,
    advancedInfo: null,
    formattedStats: {
        marketCap: "$0",
        circSupply: "0",
        holders: "0",
        volume24H: "$0",
        volume1H: "$0",
        volume4H: "$0",
        priceChange24H: "0%",
        priceChange4H: "0%",
        liquidity: "$0",
        txs24H: "0",
        tradeNum: "0",
        maxPrice: "$0",
        minPrice: "$0",
        top10HoldPercent: "—",
        lpBurnedPercent: "—",
        riskLevel: "—",
    },
    isLoading: true,
    isMock: false,
});

export function TokenStatsProvider({ children }: { children: ReactNode }) {
    const { stats, advancedInfo, formattedStats, isLoading, isMock } = useTokenStats(30000);

    return (
        <TokenStatsContext.Provider value={{ stats, advancedInfo, formattedStats, isLoading, isMock }}>
            {children}
        </TokenStatsContext.Provider>
    );
}

export function useTokenStatsContext() {
    return useContext(TokenStatsContext);
}
