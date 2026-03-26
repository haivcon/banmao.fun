"use client";

// Client wrapper for GameFi layout with wallet providers
// Note: Manifest is now set via server-side metadata in layout.tsx
import SharedProviders from "../providers";

export default function GameFiLayoutClient({ children }: { children: React.ReactNode }) {
    return <SharedProviders>{children}</SharedProviders>;
}
