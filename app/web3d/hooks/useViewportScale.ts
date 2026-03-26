import { useState, useEffect } from 'react';

// Base sizes for different viewport widths
const BREAKPOINTS = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1440,
};

// Scale factors for different screen sizes
const SCALE_FACTORS = {
    mobile: 0.6,
    tablet: 0.8,
    desktop: 1.0,
    large: 1.0,
};

export interface ScaleConfig {
    // Text sizes (in px)
    titleLarge: number;    // Logo title: 42px base
    titleMedium: number;   // Section headers: 16px base
    bodyLarge: number;     // Button text: 14px base  
    bodyMedium: number;    // Panel text: 12px base
    bodySmall: number;     // Small text: 11px base
    emoji: number;         // Emoji size: 16px base
    emojiLarge: number;    // Large emoji: 36px base
    emojiXLarge: number;   // XL emoji (download): 40px base
    // Spacing
    gap: number;           // Standard gap: 6px base
    // Button dimensions
    btnWidth: number;      // Standard button: 220px base
    btnHeight: number;     // Standard button: 55px base
}

function getScaleConfig(width: number): ScaleConfig {
    let scaleFactor: number;

    if (width <= BREAKPOINTS.mobile) {
        scaleFactor = SCALE_FACTORS.mobile;
    } else if (width <= BREAKPOINTS.tablet) {
        scaleFactor = SCALE_FACTORS.tablet;
    } else if (width <= BREAKPOINTS.desktop) {
        scaleFactor = SCALE_FACTORS.desktop;
    } else {
        scaleFactor = SCALE_FACTORS.large;
    }

    return {
        titleLarge: Math.round(42 * scaleFactor),
        titleMedium: Math.round(16 * scaleFactor),
        bodyLarge: Math.round(14 * scaleFactor),
        bodyMedium: Math.round(12 * scaleFactor),
        bodySmall: Math.round(11 * scaleFactor),
        emoji: Math.round(16 * scaleFactor),
        emojiLarge: Math.round(36 * scaleFactor),
        emojiXLarge: Math.round(40 * scaleFactor),
        gap: Math.round(6 * scaleFactor),
        btnWidth: Math.round(220 * scaleFactor),
        btnHeight: Math.round(55 * scaleFactor),
    };
}

export function useViewportScale(): ScaleConfig {
    const [scale, setScale] = useState<ScaleConfig>(() => getScaleConfig(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setScale(getScaleConfig(window.innerWidth));
        };

        // Set initial value
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return scale;
}

// Export breakpoints for potential use elsewhere
export { BREAKPOINTS, SCALE_FACTORS };
