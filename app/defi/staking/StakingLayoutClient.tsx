"use client";

// Client wrapper for Staking layout
// NOTE: We don't wrap with SharedProviders here because the parent
// DeFiLayoutClient already provides SharedProviders which includes WalletConnect.
// This prevents "WalletConnect Core is already initialized" error.

export default function StakingLayoutClient({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
