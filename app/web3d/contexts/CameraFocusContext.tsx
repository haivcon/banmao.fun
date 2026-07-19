"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ===================== TYPES =====================
interface FocusTarget {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
}

interface CustomCameraContextType {
    focusOn: (target: FocusTarget, duration?: number, forceNoReset?: boolean) => void;
    resetView: () => void;
    isFocusing: boolean;
    focusedPosition: THREE.Vector3 | null;
}

// ===================== DEFAULT VALUES =====================
const DEFAULT_DURATION = 1.0;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 2, 12);
const DEFAULT_LOOK_AT = new THREE.Vector3(0, 0, 0);

// Easing function
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

// ===================== CONTEXT =====================
const CustomCameraContext = createContext<CustomCameraContextType | null>(null);

export function useCustomCamera() {
    const context = useContext(CustomCameraContext);
    if (!context) {
        return { focusOn: () => { }, resetView: () => { }, isFocusing: false, focusedPosition: null };
    }
    return context;
}

// ===================== CUSTOM CAMERA CONTROLLER =====================
export function CustomCameraController({ children }: { children: React.ReactNode }) {
    const { camera, gl, size } = useThree();

    // Rotation state (spherical coordinates)
    const spherical = useRef({ theta: 0, phi: Math.PI / 2, radius: 12 });
    const target = useRef(new THREE.Vector3(0, 0, 0));

    // Drag state
    const isDragging = useRef(false);
    const previousMouse = useRef({ x: 0, y: 0 });

    // Focus animation state
    const [isFocusing, setIsFocusing] = useState(false);
    const [focusedPosition, setFocusedPosition] = useState<THREE.Vector3 | null>(null);
    const focusAnimation = useRef({
        active: false,
        progress: 0,
        duration: DEFAULT_DURATION,
        startPosition: new THREE.Vector3(),
        startTarget: new THREE.Vector3(),
        endPosition: new THREE.Vector3(),
        endTarget: new THREE.Vector3(),
    });

    // Zoom limits
    const minRadius = 8;
    const maxRadius = 25;

    // Reset to default view - restore to initial page load state
    const resetView = useCallback(() => {
        const anim = focusAnimation.current;

        // Calculate initial radius based on viewport (same as initialization)
        const isMobile = size.width < 768;
        const isLaptop = size.width >= 768 && size.width < 1440;
        const isPortrait = size.height > size.width;
        let initialRadius = 13;
        if (isMobile && isPortrait) {
            initialRadius = 21.5;
        } else if (isMobile) {
            initialRadius = 19.5;
        } else if (isLaptop) {
            initialRadius = 14;
        }

        // Calculate the initial camera position from spherical coords
        const initialTheta = 0;
        const initialPhi = Math.PI / 2;
        const initialTarget = new THREE.Vector3(0, 0, 0);

        const initialX = initialTarget.x + initialRadius * Math.sin(initialPhi) * Math.sin(initialTheta);
        const initialY = initialTarget.y + initialRadius * Math.cos(initialPhi);
        const initialZ = initialTarget.z + initialRadius * Math.sin(initialPhi) * Math.cos(initialTheta);
        const initialPosition = new THREE.Vector3(initialX, initialY, initialZ);

        anim.startPosition.copy(camera.position);
        anim.startTarget.copy(target.current);
        anim.endPosition.copy(initialPosition);
        anim.endTarget.copy(initialTarget);
        anim.progress = 0;
        anim.duration = DEFAULT_DURATION * 0.8;
        anim.active = true;
        setIsFocusing(true);
        setFocusedPosition(null);

        // Reset spherical coordinates to initial state
        spherical.current.theta = initialTheta;
        spherical.current.phi = initialPhi;
        spherical.current.radius = initialRadius;
        target.current.copy(initialTarget);
    }, [camera, size.width, size.height]);

    // Focus on a target (with optional toggle support)
    // forceNoReset: if true, always focus even if clicking same position (no reset toggle)
    const focusOn = useCallback((focusTarget: FocusTarget, duration = DEFAULT_DURATION, forceNoReset = false) => {
        // Check if clicking on the same position - toggle reset (unless forceNoReset)
        if (!forceNoReset && focusedPosition && focusTarget.lookAt.distanceTo(focusedPosition) < 1) {
            resetView();
            return;
        }

        const anim = focusAnimation.current;
        anim.startPosition.copy(camera.position);
        anim.startTarget.copy(target.current);
        anim.endPosition.copy(focusTarget.position);
        anim.endTarget.copy(focusTarget.lookAt);
        anim.progress = 0;
        anim.duration = duration;
        anim.active = true;
        setIsFocusing(true);
        setFocusedPosition(focusTarget.lookAt.clone()); // Store focused position
    }, [camera, focusedPosition, resetView]);

    // Mouse/touch event handlers
    useEffect(() => {
        const canvas = gl.domElement;

        // Track touch distance for pinch-to-zoom
        let touchDistance = 0;
        let touchStartTime = 0;

        const handlePointerDown = (e: PointerEvent) => {
            if (focusAnimation.current.active) return;
            isDragging.current = true;
            previousMouse.current = { x: e.clientX, y: e.clientY };
            canvas.setPointerCapture(e.pointerId);
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current || focusAnimation.current.active) return;

            const deltaX = e.clientX - previousMouse.current.x;
            const deltaY = e.clientY - previousMouse.current.y;

            // Rotate camera
            spherical.current.theta -= deltaX * 0.005;
            spherical.current.phi += deltaY * 0.005;

            // Clamp phi to avoid flipping (but allow more range than OrbitControls)
            spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));

            previousMouse.current = { x: e.clientX, y: e.clientY };
        };

        const handlePointerUp = (e: PointerEvent) => {
            isDragging.current = false;
            canvas.releasePointerCapture(e.pointerId);
        };

        const handleWheel = (e: WheelEvent) => {
            if (focusAnimation.current.active) return;
            e.preventDefault();
            spherical.current.radius += e.deltaY * 0.01;
            spherical.current.radius = Math.max(minRadius, Math.min(maxRadius, spherical.current.radius));
        };

        // Touch handlers for mobile pinch-to-zoom
        const getTouchDistance = (touches: TouchList) => {
            if (touches.length < 2) return 0;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (focusAnimation.current.active) return;
            touchStartTime = Date.now();

            if (e.touches.length === 2) {
                // Pinch gesture starting - stop rotation
                isDragging.current = false;
                e.preventDefault();
                touchDistance = getTouchDistance(e.touches);
            } else if (e.touches.length === 1) {
                // Single touch - delay rotation to avoid conflict with tap
                previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                // Don't start dragging immediately - wait for movement
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (focusAnimation.current.active) return;

            if (e.touches.length === 2) {
                // Pinch-to-zoom (priority over rotation)
                isDragging.current = false; // Stop rotation during pinch
                e.preventDefault();
                const newDistance = getTouchDistance(e.touches);
                if (touchDistance > 0) {
                    const delta = touchDistance - newDistance;
                    spherical.current.radius += delta * 0.015; // Slower zoom
                    spherical.current.radius = Math.max(minRadius, Math.min(maxRadius, spherical.current.radius));
                }
                touchDistance = newDistance;
            } else if (e.touches.length === 1) {
                // Single touch rotation - start dragging on movement
                const deltaX = e.touches[0].clientX - previousMouse.current.x;
                const deltaY = e.touches[0].clientY - previousMouse.current.y;
                const movement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // Only start rotation after significant movement (5px threshold)
                if (movement > 5) {
                    isDragging.current = true;
                }

                if (isDragging.current) {
                    spherical.current.theta -= deltaX * 0.004; // Slightly slower
                    spherical.current.phi += deltaY * 0.004;
                    spherical.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.current.phi));
                }

                previousMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };

        const handleTouchEnd = () => {
            isDragging.current = false;
            touchDistance = 0;
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointerleave', handlePointerUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Mobile touch events
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointerleave', handlePointerUp);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [gl]);

    // Initialize camera position based on viewport
    useEffect(() => {
        const isMobile = size.width < 768;
        const isLaptop = size.width >= 768 && size.width < 1440;
        const isPortrait = size.height > size.width;

        if (isMobile && isPortrait) {
            spherical.current.radius = 21.5; // Zoomed out for smaller scale on mobile portrait
        } else if (isMobile) {
            spherical.current.radius = 19.5; // Mobile landscape
        } else if (isLaptop) {
            spherical.current.radius = 14;
        } else {
            spherical.current.radius = 13;
        }
    }, [size.height, size.width]);

    // Main animation loop
    useFrame((_, rawDelta) => {
        // Clamp delta to prevent camera jumps after tab inactivity
        const delta = Math.min(rawDelta, 0.1);
        const anim = focusAnimation.current;

        if (anim.active) {
            // Focus animation
            anim.progress = Math.min(anim.progress + delta / anim.duration, 1);
            const t = easeOutCubic(anim.progress);

            camera.position.lerpVectors(anim.startPosition, anim.endPosition, t);
            target.current.lerpVectors(anim.startTarget, anim.endTarget, t);
            camera.lookAt(target.current);

            if (anim.progress >= 1) {
                anim.active = false;
                setIsFocusing(false);

                // Sync spherical coordinates with new position
                const offset = camera.position.clone().sub(target.current);
                spherical.current.radius = offset.length();
                spherical.current.theta = Math.atan2(offset.x, offset.z);
                spherical.current.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / spherical.current.radius)));
            }
        } else if (!isDragging.current) {
            // Normal camera update from spherical coordinates
            const s = spherical.current;
            const x = target.current.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta);
            const y = target.current.y + s.radius * Math.cos(s.phi);
            const z = target.current.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta);

            camera.position.set(x, y, z);
            camera.lookAt(target.current);
        } else {
            // While dragging - update in real time
            const s = spherical.current;
            const x = target.current.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta);
            const y = target.current.y + s.radius * Math.cos(s.phi);
            const z = target.current.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta);

            camera.position.set(x, y, z);
            camera.lookAt(target.current);
        }
    });

    return (
        <CustomCameraContext.Provider value={{ focusOn, resetView, isFocusing, focusedPosition }}>
            {children}
        </CustomCameraContext.Provider>
    );
}

// ===================== HELPER to create focus target =====================
export function createFocusTarget(
    objectPosition: [number, number, number],
    cameraDistance: number = 5,
    cameraHeight: number = 1
): FocusTarget {
    const objPos = new THREE.Vector3(...objectPosition);

    // Increase distance on mobile to prevent too-close zoom
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const mobileMultiplier = isMobile ? 1.5 : 1;
    const adjustedDistance = cameraDistance * mobileMultiplier;
    const adjustedHeight = cameraHeight * mobileMultiplier;

    const cameraPos = objPos.clone().add(new THREE.Vector3(0, adjustedHeight, adjustedDistance));

    return {
        position: cameraPos,
        lookAt: objPos,
    };
}

export default CustomCameraController;
