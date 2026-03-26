// Theme configuration for 3D web elements
// Only 2 themes for main website: Gold and Cyber

export type Web3DThemeKey = "gold" | "cyber";

export interface Web3DTheme {
    key: Web3DThemeKey;
    name: string;
    icon: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export const WEB3D_THEMES: Web3DTheme[] = [
    {
        key: "gold",
        name: "Original Gold",
        icon: "⭐",
        primary: "#FFD700",
        secondary: "#FFB300",
        accent: "#FFEB3B",
        background: "#0a0a1a",
        text: "#ffffff",
    },
    {
        key: "cyber",
        name: "Cyber Space",
        icon: "🌌",
        primary: "#00F3FF",
        secondary: "#BC13FE",
        accent: "#22d3ee",
        background: "#0a0a1a",
        text: "#ffffff",
    },
];

export const DEFAULT_WEB3D_THEME: Web3DThemeKey = "gold";

export const THEME_STORAGE_KEY = "banmao_web3d_theme";

// Helper to get theme by key
export function getWeb3DTheme(key: Web3DThemeKey): Web3DTheme {
    return WEB3D_THEMES.find(t => t.key === key) || WEB3D_THEMES[0];
}

// Helper to check if a value is a valid theme key
export function isWeb3DThemeKey(value: string): value is Web3DThemeKey {
    return value === "gold" || value === "cyber";
}
