// Responsive Layout Configuration for 3D Scene
// Centralized layout management for PC, Mobile Portrait, and Mobile Landscape

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface SceneLayout {
    // Panels
    leftPanel: Position3D;
    rightPanel: Position3D;
    settingsPanel: Position3D;
    burnPanel: Position3D;

    // Buttons
    buttonsY: number;
    buttonsZ: number;
    buyBtnX: number;
    joinBtnX: number;
    gamefiBtnX: number;
    buttonSpacingY: number;

    // Effects & decorations
    tokenCoin: Position3D;
    okxLogo: Position3D;
    communityHub: Position3D;
    blackHole: Position3D;
    mascot: Position3D;
    tokenChart: Position3D;
    tokenInfo: Position3D;
    dancingLogo: Position3D;

    // Visibility flags (for mobile optimization)
    showCommunityHub: boolean;
    showOKXLogo: boolean;
    showTokenCoin: boolean;
    showFloatingCubes: boolean;

    // Size multipliers
    panelScale: number;
    buttonScale: number;
    mascotScale: number;
    particleCount: number;
    orbCount: number;
}

// ===================== PC/DESKTOP LAYOUT =====================
export const PC_LAYOUT: SceneLayout = {
    // Panels - symmetric left/right
    leftPanel: { x: -6.5, y: 0.5, z: 2 },
    rightPanel: { x: 6.5, y: 0.5, z: 2 },
    settingsPanel: { x: 3, y: 1.2, z: 3 },  // Moved to center-right (was burnPanel position)
    burnPanel: { x: 6.5, y: -2.3, z: 2 },  // Moved to right-bottom (was settingsPanel position)

    // Buttons - grouped center bottom
    buttonsY: -3,
    buttonsZ: 4.5,
    buyBtnX: -2.5,
    joinBtnX: 0,
    gamefiBtnX: 2.5,
    buttonSpacingY: 0.65,

    // Effects & decorations
    tokenCoin: { x: -4.5, y: 3, z: 0 },
    okxLogo: { x: 6.8, y: 4.5, z: -2 },
    communityHub: { x: -6.8, y: -3, z: 2 },
    blackHole: { x: -7, y: 4.5, z: 0 },
    mascot: { x: 0, y: -0.5, z: 0 },
    tokenChart: { x: 0, y: -2, z: 0 },
    tokenInfo: { x: 0, y: 2.5, z: 2 },
    dancingLogo: { x: 0, y: -3, z: 2 },

    // Visibility - show everything on PC
    showCommunityHub: true,
    showOKXLogo: true,
    showTokenCoin: true,
    showFloatingCubes: true,

    // Size multipliers
    panelScale: 1,
    buttonScale: 1,
    mascotScale: 180,
    particleCount: 150,
    orbCount: 12,
};

// ===================== MOBILE PORTRAIT LAYOUT =====================
// Full-featured vertical layout - ALL elements like PC, arranged top-to-bottom
// ZOOMED IN view with larger elements spread vertically
export const MOBILE_PORTRAIT_LAYOUT: SceneLayout = {
    // === SECTION 1: INFO PANELS - Stacked vertically, LARGER ===
    leftPanel: { x: -2.1, y: 2.3, z: 2 },       // Token Stats - top
    rightPanel: { x: 2, y: -4, z: 2 },       // Price Feed - middle  
    settingsPanel: { x: 2.7, y: 0.2, z: 2 },   // Swapped with burnPanel
    burnPanel: { x: -2.2, y: -4, z: 2 },        // Swapped with settingsPanel

    // === SECTION 2: ACTION BUTTONS - HORIZONTAL row ===
    buttonsY: -5.5,
    buttonsZ: 4.4,
    buyBtnX: -2.2,    // Left button
    joinBtnX: 0,      // Center button  
    gamefiBtnX: 2.2,  // Right button a
    buttonSpacingY: 0,  // Not used in horizontal layout

    // === SECTION 3: DECORATIONS ===
    tokenCoin: { x: 1.8, y: 5.9, z: 0 },       // Top-right corner
    mascot: { x: 0, y: -0.4, z: 0 },          // CENTER - standing on piechart
    tokenChart: { x: 0, y: -1.2, z: 0 },      // Piechart below mascot

    // === SECTION 4: LOWER ELEMENTS ===
    communityHub: { x: -2.5, y: 5.8, z: -1 },    // Bottom-left
    okxLogo: { x: 2, y: 7.7, z: -1 },          // Bottom-right
    blackHole: { x: -2.5, y: 8.3, z: 0 },      // Top-left corner on mobile
    tokenInfo: { x: 2, y: 2.8, z: 2 },         // Above mascot - adjusted lower
    dancingLogo: { x: 0, y: -2, z: 2 },      // Below piechart

    // === VISIBILITY: Show EVERYTHING ===
    showCommunityHub: true,
    showOKXLogo: true,
    showTokenCoin: true,
    showFloatingCubes: true,

    // === SIZE: LARGER on mobile (was 0.7, now 0.9) ===
    panelScale: 0.9,          // 90% of PC size - BIGGER!
    buttonScale: 0.95,        // 95% of PC size
    mascotScale: 120,         // Larger mascot
    particleCount: 80,
    orbCount: 6,
};

// ===================== MOBILE LANDSCAPE LAYOUT =====================
// For horizontal phone orientation
export const MOBILE_LANDSCAPE_LAYOUT: SceneLayout = {
    // Panels - side by side but smaller
    leftPanel: { x: -3.5, y: 0.5, z: 3 },
    rightPanel: { x: 3.5, y: 0.5, z: 3 },
    settingsPanel: { x: 0, y: 2.2, z: 2 },  // Swapped - center top
    burnPanel: { x: 3.5, y: -1, z: 3.5 },  // Swapped - right side

    // Buttons - horizontal row at bottom
    buttonsY: -2.2,
    buttonsZ: 4.5,
    buyBtnX: -2,
    joinBtnX: 0,
    gamefiBtnX: 2,
    buttonSpacingY: 0.55,

    // Effects
    tokenCoin: { x: -3, y: 2.5, z: 0 },
    okxLogo: { x: 3, y: 2.5, z: -2 },
    communityHub: { x: 4.5, y: -0.5, z: -3 },
    blackHole: { x: -4, y: 2, z: 0 },        // Left side on landscape
    mascot: { x: 0, y: 0, z: 0 },
    tokenChart: { x: 0, y: -1.5, z: 0 },
    tokenInfo: { x: 0, y: 2.2, z: 2 },          // Top center - adjusted lower
    dancingLogo: { x: 0, y: -2.5, z: 2 },       // Below piechart

    // Visibility - show more in landscape
    showCommunityHub: false,   // Still too crowded
    showOKXLogo: true,
    showTokenCoin: true,
    showFloatingCubes: true,

    // Size multipliers
    panelScale: 0.8,
    buttonScale: 0.9,
    mascotScale: 130,
    particleCount: 80,
    orbCount: 8,
};

// ===================== HOOK: useResponsiveLayout =====================
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';

export function useResponsiveLayout(): {
    layout: SceneLayout;
    isMobile: boolean;
    isPortrait: boolean;
    isLandscape: boolean;
} {
    const { size } = useThree();

    return useMemo(() => {
        const isMobile = size.width < 768;
        const isPortrait = size.height > size.width;
        const isLandscape = size.width > size.height && isMobile;

        let layout: SceneLayout;

        if (!isMobile) {
            layout = PC_LAYOUT;
        } else if (isPortrait) {
            layout = MOBILE_PORTRAIT_LAYOUT;
        } else {
            layout = MOBILE_LANDSCAPE_LAYOUT;
        }

        return {
            layout,
            isMobile,
            isPortrait,
            isLandscape,
        };
    }, [size.width, size.height]);
}

// ===================== UTILITY FUNCTIONS =====================

/**
 * Get scaled panel dimensions based on layout
 */
export function getPanelDimensions(layout: SceneLayout): {
    width: number;
    height: number;
} {
    const baseWidth = 3.2;
    const baseHeight = 2.2;
    return {
        width: baseWidth * layout.panelScale,
        height: baseHeight * layout.panelScale,
    };
}

/**
 * Get number of particles/effects based on layout
 */
export function getEffectCounts(layout: SceneLayout): {
    particles: number;
    orbs: number;
} {
    return {
        particles: layout.particleCount,
        orbs: layout.orbCount,
    };
}
