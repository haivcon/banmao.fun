// lib/themeColor.ts
// Dynamic theme-color meta tag updater for PWA status bar

/**
 * Theme color map matching the CSS theme variables
 */
export const THEME_COLORS: Record<string, string> = {
    gold: "#FFD700",
    white: "#00d9ff",
    crimson: "#ff4d4f",
    emerald: "#00ff9d",
    pink: "#ff6ec7",
    orange: "#ff9a4c",
    purple: "#a077ff",
    cyber: "#00F3FF",
};

/**
 * Default theme color (gold)
 */
export const DEFAULT_THEME_COLOR = "#FFD700";

/**
 * Update the theme-color meta tag dynamically
 * This affects the status bar color on mobile PWAs
 */
export function updateThemeColor(theme: string): void {
    if (typeof document === "undefined") return;

    const themeColor = THEME_COLORS[theme] || DEFAULT_THEME_COLOR;

    // Update or create theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", themeColor);

    // Update msapplication-navbutton-color for Windows
    let metaNavButton = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (!metaNavButton) {
        metaNavButton = document.createElement("meta");
        metaNavButton.setAttribute("name", "msapplication-navbutton-color");
        document.head.appendChild(metaNavButton);
    }
    metaNavButton.setAttribute("content", themeColor);

    // Update apple-mobile-web-app-status-bar-style for iOS
    // Note: iOS only supports default, black, or black-translucent
    // We'll set it to black-translucent for a sleek look
    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaAppleStatus) {
        metaAppleStatus = document.createElement("meta");
        metaAppleStatus.setAttribute("name", "apple-mobile-web-app-status-bar-style");
        document.head.appendChild(metaAppleStatus);
    }
    // Use black-translucent for all themes (allows content to show through)
    metaAppleStatus.setAttribute("content", "black-translucent");
}

/**
 * Get the theme color for a given theme key
 */
export function getThemeColor(theme: string): string {
    return THEME_COLORS[theme] || DEFAULT_THEME_COLOR;
}
