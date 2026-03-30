import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';

const REFERENCE_WIDTH = 1440;

/**
 * Returns a CSS scale factor for Html content wrappers.
 * When viewport shrinks, apply this as CSS transform: scale(htmlScale)
 * on the content div INSIDE drei's Html component.
 * 
 * DO NOT use this to modify distanceFactor (causes position shifts).
 * 
 * Usage:
 * <Html center distanceFactor={8}>
 *   <div style={{ transform: `scale(${htmlScale})` }}>
 *     ...content...
 *   </div>
 * </Html>
 */
export function useHtmlScale(): number {
    const size = useThree(state => state.size);
    return useMemo(() => {
        // With a fixed vertical FOV (55 or 65 degrees), the on-screen pixel size of 
        // 3D elements is directly proportional to window.innerHeight.
        // However, Html components with distanceFactor maintain constant pixel sizes.
        // To prevent text from overflowing 3D panels when height shrinks, we scale it.
        
        // 900px is the typical reference height for 1.0 scale
        const REFERENCE_HEIGHT = 900;
        let scale = size.height / REFERENCE_HEIGHT;

        // Factor in camera z-distance from ResponsiveCamera logic
        // Desktop: z=13, Laptop: z=14, Mobile: z=19.5
        let zRatio = 1.0;
        if (size.width < 768) {
            zRatio = 13 / 19.5; // Desktop Z / Mobile Z
            zRatio *= 0.81; // Math.tan(55/2) / Math.tan(65/2) approx 0.81
            // On mobile, height is often larger than width, we might want to bound it
            scale = Math.min(scale, size.width / 400); 
        } else if (size.width < 1440) {
            zRatio = 13 / 14;   // Desktop Z / Laptop Z
        } else {
            // Cap scale on desktop so it doesn't get ridiculously huge on 4K monitors
            scale = Math.min(1.2, scale);
        }

        scale *= zRatio;

        // Return a clamped scale (0.4 to 1.2)
        return Math.max(0.4, scale);
    }, [size.height, size.width]);
}
