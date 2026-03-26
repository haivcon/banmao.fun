"use client";

// Client wrapper for DeFi layout with wallet providers
// Syncs wallet connection state with GameFi pages
import SharedProviders from "../providers";
import { Toaster } from 'react-hot-toast';

export default function DeFiLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <SharedProviders>
            {children}
            <Toaster position="top-center" reverseOrder={false} />
        </SharedProviders>
    );
}
