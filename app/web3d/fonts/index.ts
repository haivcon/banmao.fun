// Font configuration for 3D elements
// Place your font files (.woff, .woff2, .ttf) in this folder
// Then update the paths below to point to your local font files

// How to use local fonts:
// 1. Download fonts and place them in this folder (app/web3d/fonts/)
// 2. Update the paths below to match your font file names
// 3. Import and use these constants in your 3D components

// Example font files you can add:
// - space-mono-regular.woff
// - space-mono-bold.woff
// - orbitron-regular.woff
// - rajdhani-regular.woff

// Base path for local fonts (relative to public folder)
const FONT_BASE_PATH = '/fonts/';

// Font configurations
export interface FontConfig {
    name: string;
    path: string | undefined;
    fallback: string;
}

// Space Mono - for tech/code style text
export const SPACE_MONO: FontConfig = {
    name: 'Space Mono',
    // Set to undefined to use default font, or point to local file
    // IMPORTANT: drei/troika works best with .woff or .woff2 format, NOT .ttf
    // Example: '/fonts/SpaceMono-Regular.woff'
    path: '/fonts/SpaceMono-Regular.woff', // TTF may cause black screen - use WOFF format instead
    fallback: 'monospace',
};

// Orbitron - for futuristic headings
export const ORBITRON: FontConfig = {
    name: 'Orbitron',
    // IMPORTANT: Use .woff or .woff2 format
    // Example: '/fonts/Orbitron-Regular.woff'
    path: '/fonts/Orbitron-VariableFont_wght.ttf',
    fallback: 'sans-serif',
};

// Rajdhani - for modern UI text
export const RAJDHANI: FontConfig = {
    name: 'Rajdhani',
    // IMPORTANT: Use .woff or .woff2 format
    // Example: '/fonts/Rajdhani-Regular.woff'
    path: '/fonts/Rajdhani-Regular.ttf',
    fallback: 'sans-serif',
};

// Chakra Petch - for gaming style
export const CHAKRA_PETCH: FontConfig = {
    name: 'Chakra Petch',
    // IMPORTANT: Use .woff or .woff2 format
    // Example: '/fonts/ChakraPetch-Regular.woff'
    path: '/fonts/ChakraPetch-Regular.ttf',
    fallback: 'sans-serif',
};

// Default 3D font - used across all 3D text elements
// Change this to switch the font used in 3D space
export const DEFAULT_3D_FONT = SPACE_MONO.path;

// Helper function to get font path (returns undefined if not set, which uses drei default)
export function getFontPath(font: FontConfig): string | undefined {
    return font.path;
}

// Export font base path for reference
export { FONT_BASE_PATH };
