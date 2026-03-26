// app/gamefi/banmaorps/GameLayoutClient.tsx
"use client";

import "./globals.css";
// NOTE: We don't wrap with our own Providers here because the parent 
// GameFiLayoutClient already provides SharedProviders which includes WalletConnect.
// This prevents "WalletConnect Core is already initialized" error.
import { useEffect } from "react";

export default function GameLayoutClient({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Theme persistence logic - using correct storage keys
        const savedTheme = localStorage.getItem("banmao_theme");
        if (savedTheme) {
            document.body.setAttribute("data-theme", savedTheme);
        }

        const savedScale = localStorage.getItem("banmao_ui_scale");
        if (savedScale) {
            document.body.setAttribute("data-ui-scale", savedScale);
        }
    }, []);

    // Just return children directly, the providers are already in parent layout
    return <>{children}</>;
}

