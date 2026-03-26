// MacOSDock.tsx - macOS-style bottom dock with magnify effect + sounds
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { slotsSounds } from '../lib/sounds';

interface DockItem {
    id: string;
    icon: string;
    image?: string;
    label: string;
    onClick?: () => void;
    href?: string;
    isActive?: boolean;
    isMinimized?: boolean;
    highlight?: 'gold' | 'green' | 'purple';
}

interface MacOSDockProps {
    items: DockItem[];
    onItemClick?: (id: string) => void;
    triggerImage?: string;
}

export function MacOSDock({ items, onItemClick, triggerImage }: MacOSDockProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [mouseX, setMouseX] = useState<number | null>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const lastHoveredRef = useRef<number | null>(null);

    // Responsive State
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Config - Larger sizes for better visibility
    const baseSize = isMobile ? 75 : 90; // Icon size
    const closedSize = isMobile ? 110 : 115; // Trigger button container
    const openSize = isMobile ? 360 : 450; // Expanded ring diameter
    const ringRadius = isMobile ? 130 : 160; // Icon orbit radius

    // -- DRAGGING LOGIC (POSITION) --
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ clientX: number, clientY: number, startX: number, startY: number } | null>(null);
    const hasDraggedRef = useRef(false);

    // -- ROTATION LOGIC (SPINNER) --
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const rotationStartRef = useRef<{ startAngle: number, currentRotation: number } | null>(null);

    // -- AUTO ROTATION (Clock tick effect) --
    const [autoRotationOffset, setAutoRotationOffset] = useState(0);
    const autoRotationPaused = useRef(false);
    const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setAutoRotationOffset(0);
            return;
        }

        const angleStep = (2 * Math.PI) / items.length; // One position step
        // Rotate faster when hovering trigger (every 500ms), normal is 3s
        const rotationSpeed = isHoveringTrigger ? 500 : 3000;

        const interval = setInterval(() => {
            if (!autoRotationPaused.current && !isSpinning) {
                setAutoRotationOffset(prev => prev + angleStep);
                // Play tick sound on each rotation
                slotsSounds.tick();
            }
        }, rotationSpeed);

        return () => clearInterval(interval);
    }, [isOpen, items.length, isSpinning, isHoveringTrigger]);

    // Pause auto-rotation when user is interacting (but NOT when hovering)
    useEffect(() => {
        if (isSpinning || isDragging) {
            autoRotationPaused.current = true;
        } else {
            // Resume after 2 seconds of no interaction
            const timeout = setTimeout(() => {
                autoRotationPaused.current = false;
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [isSpinning, isDragging]);

    const getAngle = (clientX: number, clientY: number) => {
        if (!dockRef.current) return 0;
        const rect = dockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(clientY - centerY, clientX - centerX);
    };

    // -- POSITION HANDLERS (Move the whole dock) --
    const startDrag = (clientX: number, clientY: number) => {
        dragStartRef.current = {
            clientX,
            clientY,
            startX: position.x,
            startY: position.y
        };
        hasDraggedRef.current = false;
    };

    const moveDrag = (clientX: number, clientY: number) => {
        if (!dragStartRef.current) return;
        const dx = clientX - dragStartRef.current.clientX;
        const dy = clientY - dragStartRef.current.clientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            hasDraggedRef.current = true;
            setIsDragging(true);
        }
        setPosition({
            x: dragStartRef.current.startX + dx,
            y: dragStartRef.current.startY + dy
        });
    };

    const endDrag = () => {
        dragStartRef.current = null;
        setTimeout(() => setIsDragging(false), 50);
    };

    // -- SPINNER HANDLERS (Rotate contents) --
    const startSpin = (clientX: number, clientY: number) => {
        const angle = getAngle(clientX, clientY);
        rotationStartRef.current = {
            startAngle: angle,
            currentRotation: rotation
        };
        hasDraggedRef.current = false;
        setIsSpinning(true);
    };

    const moveSpin = (clientX: number, clientY: number) => {
        if (!rotationStartRef.current) return;
        const angle = getAngle(clientX, clientY);
        const delta = angle - rotationStartRef.current.startAngle;
        if (Math.abs(delta) > 0.05) hasDraggedRef.current = true;
        setRotation(rotationStartRef.current.currentRotation + delta);
    };

    const endSpin = () => {
        rotationStartRef.current = null;
        setIsSpinning(false);
    };

    // MOUSE EVENT DISPATCHER
    const handleMouseDown = (e: React.MouseEvent) => {
        // Default Logic for Background: Spin if Open, Drag if Closed? 
        // Actually, Background (Ring) should probably Drag Position if Closed, Spin if Open?
        // Let's mirror Touch logic: 
        // Trigger -> Drag Position.
        // Backdrop -> Spin.

        // This handler handles the div events.
        // If target is Trigger, it stops propagation. 
        // So clicking backdrop here means "Start Spin".
        if (isOpen) {
            e.preventDefault();
            startSpin(e.clientX, e.clientY);
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        } else {
            // Closed: Backdrop is just the Trigger container basically.
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }
    };

    // Global Mouse Handlers need to handle BOTH modes
    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        if (dragStartRef.current) moveDrag(e.clientX, e.clientY);
        if (rotationStartRef.current) moveSpin(e.clientX, e.clientY);
    }, []);

    const handleGlobalMouseUp = useCallback(() => {
        endDrag();
        endSpin();
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);


    // TOUCH LISTENERS
    const handleTriggerTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    };

    const handleBackdropTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        if (isOpen) {
            startSpin(touch.clientX, touch.clientY);
        } else {
            startDrag(touch.clientX, touch.clientY);
        }
    };

    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (dragStartRef.current) {
                if (e.cancelable) e.preventDefault();
                moveDrag(touch.clientX, touch.clientY);
            }
            if (rotationStartRef.current) {
                if (e.cancelable) e.preventDefault();
                moveSpin(touch.clientX, touch.clientY);
            }
        };

        const handleTouchEnd = () => {
            endDrag();
            endSpin();
        };

        const dockEl = dockRef.current;
        if (dockEl) {
            dockEl.addEventListener('touchmove', handleTouchMove, { passive: false });
            dockEl.addEventListener('touchend', handleTouchEnd);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            if (dockEl) {
                dockEl.removeEventListener('touchmove', handleTouchMove);
                dockEl.removeEventListener('touchend', handleTouchEnd);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [isOpen]);

    // -- MOUSE HOVER FOR SCALE (Available if not spinning) --
    const getScale = useCallback((index: number): number => {
        // On desktop, we can keep scale effect if not spinning?
        // But in Radial layout, scale logic based on X distance is weird.
        // Let's disabling Magnify for Radial Layout to keep it clean.
        // Or implement Radial Magnify (Distance from Mouse to Icon Center).

        if (!isOpen || hoveredIndex === null || mouseX === null || !dockRef.current || isSpinning) return 1;

        // Simple radial magnify?
        // Need exact icon position. Hard to get cheaply.
        // Let's just do Hover Scale only.
        return 1;
    }, [isOpen, hoveredIndex, mouseX, isSpinning]);

    const handleIconHover = (index: number) => {
        if (!isOpen || isSpinning) return;
        setHoveredIndex(index);
        if (lastHoveredRef.current !== index && !isSpinning) {
            slotsSounds.hover();
            lastHoveredRef.current = index;
        }
    };

    const handleIconClick = (item: DockItem, e: React.MouseEvent) => {
        if (hasDraggedRef.current) {
            e.preventDefault(); e.stopPropagation(); return;
        }
        slotsSounds.click();
        if (item.onClick) item.onClick();
        if (onItemClick) onItemClick(item.id);
    };

    // Render Item Helper
    const renderItem = (item: DockItem, index: number, style?: React.CSSProperties) => {
        const scale = hoveredIndex === index ? 1.2 : 1; // Simple Scale
        const isHovered = hoveredIndex === index;

        const iconContent = (
            <div
                className={`dock-icon-wrapper ${item.isMinimized ? 'dock-minimized-bounce' : ''}`}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
                    transform: 'none', // Managed by parent style
                    position: 'relative',
                    minWidth: 'auto',
                    marginBottom: 0,
                    ...style
                }}
                onMouseEnter={() => {
                    handleIconHover(index);
                    autoRotationPaused.current = true; // Pause rotation on icon hover
                }}
                onMouseLeave={() => {
                    setHoveredIndex(null);
                    autoRotationPaused.current = false; // Resume rotation when leaving
                }}
                onClick={(e) => handleIconClick(item, e)}
                // Spin triggers
                onTouchStart={(e) => {
                    e.stopPropagation();
                    startSpin(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startSpin(e.clientX, e.clientY);
                    document.addEventListener('mousemove', handleGlobalMouseMove);
                    document.addEventListener('mouseup', handleGlobalMouseUp);
                }}
            >
                {/* Tooltip/Label - Always Below for Radial */}
                {isOpen && (
                    <div style={{
                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                        marginTop: 4,
                        padding: '2px 6px',
                        background: 'rgba(0,0,0,0.6)', borderRadius: 4,
                        color: '#fff',
                        fontSize: 9, fontWeight: 500,
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        opacity: (isSpinning || !isOpen) ? 0 : (isHovered ? 1 : 0.7), // Show on hover or always? Always but dim.
                        transition: 'opacity 0.2s'
                    }}>
                        {item.label}
                    </div>
                )}

                {/* Icon Box */}
                <div style={{
                    width: baseSize, height: baseSize,
                    background: 'transparent',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? 22 : 28,
                    filter: isHovered || item.isActive ? 'drop-shadow(0 0 10px rgba(255,255,255,0.6))' : 'drop-shadow(0 0 2px rgba(255,255,255,0.1))',
                    transitionProperty: 'filter, transform',
                    transitionDuration: '0.3s, 0.2s',
                    transitionTimingFunction: 'ease, ease',
                    transform: `scale(${scale})`, // Apply Hover Scale here
                    position: 'relative', overflow: 'visible',
                    animationName: (!isSpinning && !isHovered) ? 'float' : 'none',
                    animationDuration: '3s',
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${index * 0.15}s`
                }}>
                    {item.image ? (
                        <img src={item.image} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                    ) : (
                        <span style={{ position: 'relative', zIndex: 1 }}>{item.icon}</span>
                    )}
                    {item.isMinimized && (
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: '50%',
                            background: '#f59e0b', border: '2px solid #fff', zIndex: 5
                        }} />
                    )}
                </div>
            </div>
        );

        if (item.href) {
            return <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }} onClick={(e) => { if (hasDraggedRef.current) { e.preventDefault(); return; } slotsSounds.click(); }}>{iconContent}</Link>;
        }
        return <div key={item.id}>{iconContent}</div>;
    };

    // -- RADIAL LAYOUT CALCULATION --
    const getRadialStyle = (index: number, total: number) => {
        const radius = ringRadius;
        const startAngle = -Math.PI / 2;
        const angleStep = (2 * Math.PI) / total;
        // Add autoRotationOffset for clock tick effect
        const angle = startAngle + (index * angleStep) + rotation + autoRotationOffset;

        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        // Check if auto-rotating to use smooth tick transition
        const isAutoRotating = !isSpinning && autoRotationOffset > 0;

        return {
            position: 'absolute' as 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -baseSize / 2,
            marginTop: -baseSize / 2,
            transform: `translate(${x}px, ${y}px) scale(${isSpinning ? 0.9 : 1})`,
            opacity: isOpen ? 1 : 0,
            // Use separate transition properties to avoid conflict with transitionDelay
            transitionProperty: 'transform, opacity',
            transitionDuration: isSpinning ? '0s' : isAutoRotating ? '0.4s, 0.5s' : '0.5s',
            transitionTimingFunction: isSpinning
                ? 'linear'
                : isAutoRotating
                    ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' // Bouncy tick
                    : 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transitionDelay: isSpinning ? '0s' : `${index * 0.02}s`,
            zIndex: 50,
        };
    };

    return (
        <>
            <style>{`
                @keyframes dockBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .dock-minimized-bounce {
                    animation: dockBounce 0.6s ease-in-out 3;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes radiate {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
                @keyframes neon-breathe {
                    0%, 100% { box-shadow: 0 15px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(0, 191, 255, 0.2) inset, 0 0 15px rgba(0, 191, 255, 0.2); border-color: rgba(0, 191, 255, 0.3); }
                    50% { box-shadow: 0 15px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(0, 191, 255, 0.3) inset, 0 0 35px rgba(0, 191, 255, 0.4); border-color: rgba(0, 191, 255, 0.6); }
                }
            `}</style>

            <div
                ref={dockRef}
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',

                    background: 'transparent',
                    backdropFilter: 'blur(5px)',

                    // UNIFIED: Always Circular Backdrop
                    borderRadius: isOpen ? '50%' : 9999,
                    border: '1px solid rgba(0, 191, 255, 0.4)',

                    animation: isOpen ? 'neon-breathe 4s ease-in-out infinite' : 'none',
                    boxShadow: isOpen
                        ? '0 15px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 191, 255, 0.2) inset, 0 0 30px rgba(0, 191, 255, 0.3)'
                        : '0 15px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 191, 255, 0.1) inset, 0 0 15px rgba(0, 191, 255, 0.2)',

                    padding: 0, // Padding not needed for Absolute Radial
                    width: isOpen ? openSize : closedSize,
                    height: isOpen ? openSize : closedSize,

                    cursor: isOpen ? 'default' : 'move',
                    touchAction: 'none',

                    transition: isDragging ? 'none' : 'width 0.4s, height 0.4s, padding 0.4s, background 0.4s, border-radius 0.4s',
                }}
                // Remove generic onMouseMove here, use global listeners triggered by MouseDown
                onMouseDown={handleMouseDown}
                onTouchStart={handleBackdropTouchStart}
                data-rain-target="true"
            >
                {/* Trigger Button - Always Center */}
                <div
                    data-tour="dock-trigger"
                    onClick={(e) => {
                        if (hasDraggedRef.current) {
                            e.preventDefault(); e.stopPropagation(); return;
                        }
                        slotsSounds.click();
                        setIsOpen(!isOpen);
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation(); e.preventDefault();
                        startDrag(e.clientX, e.clientY);
                        document.addEventListener('mousemove', handleGlobalMouseMove);
                        document.addEventListener('mouseup', handleGlobalMouseUp);
                    }}
                    onTouchStart={handleTriggerTouchStart}
                    style={{
                        width: isMobile ? 100 : 110,
                        height: isMobile ? 100 : 110,
                        minWidth: isMobile ? 100 : 110,

                        borderRadius: '50%',
                        aspectRatio: '1/1',
                        boxSizing: 'border-box',
                        background: 'transparent',
                        border: '2px solid rgba(0, 191, 255, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isMobile ? 22 : 28,
                        cursor: isDragging ? 'grabbing' : 'pointer',
                        color: 'white',
                        animation: isOpen ? 'none' : 'radiate 2s infinite',
                        boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',

                        transition: 'transform 0.2s',
                        zIndex: 200,
                        overflow: 'hidden',
                        margin: 0, // No margin needed, absolute siblings
                        flexShrink: 0,
                        position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                        if (!isDragging) e.currentTarget.style.transform = 'scale(1.1)';
                        if (isOpen) setIsHoveringTrigger(true);
                    }}
                    onMouseLeave={(e) => {
                        if (!isDragging) e.currentTarget.style.transform = 'scale(1)';
                        setIsHoveringTrigger(false);
                    }}
                >
                    {isOpen ? (
                        <span style={{ position: 'relative', zIndex: 3, fontWeight: 700 }}>✕</span>
                    ) : (
                        triggerImage ? (
                            <img src={triggerImage} alt="Apps" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6, position: 'relative', zIndex: 1 }} />
                        ) : (
                            <span style={{ position: 'relative', zIndex: 3 }}>📱</span>
                        )
                    )}
                </div>

                {/* UNIFIED RADIAL LAYOUT */}
                {isOpen && (
                    <>
                        {items.map((item, i) => renderItem(item, i, getRadialStyle(i, items.length)))}
                    </>
                )}
            </div>
        </>
    );
}

export default MacOSDock;
