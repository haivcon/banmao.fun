// app/gamefi/banmaosnake/SnakeLayoutClient.tsx
"use client";

import "./globals.css";
// NOTE: We don't wrap with our own Providers here because the parent 
// GameFiLayoutClient already provides SharedProviders which includes WalletConnect.
// This prevents "WalletConnect Core is already initialized" error.

export default function SnakeLayoutClient({ children }: { children: React.ReactNode }) {
    // Just return children directly, the providers are already in parent layout
    return <>{children}</>;
}

