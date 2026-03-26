// Token Stats Context - Share API data across components
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useTokenStats } from "../hooks/useTokenStats";

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
    formattedStats: {
        marketCap: string;
        circSupply: string;
        holders: string;
        volume24H: string;
        priceChange24H: string;
        liquidity: string;
    };
    isLoading: boolean;
    isMock: boolean;
}

const TokenStatsContext = createContext<TokenStatsContextType>({
    stats: null,
    formattedStats: {
        marketCap: "$0",
        circSupply: "0",
        holders: "0",
        volume24H: "$0",
        priceChange24H: "0%",
        liquidity: "$0",
    },
    isLoading: true,
    isMock: false,
});

export function TokenStatsProvider({ children }: { children: ReactNode }) {
    const { stats, formattedStats, isLoading, isMock } = useTokenStats(30000);

    return (
        <TokenStatsContext.Provider value={{ stats, formattedStats, isLoading, isMock }}>
            {children}
        </TokenStatsContext.Provider>
    );
}

export function useTokenStatsContext() {
    return useContext(TokenStatsContext);
}
