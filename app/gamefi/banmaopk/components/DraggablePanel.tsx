'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

// Simple no-op sound functions (no sound in PK module)

interface DraggablePanelProps {
    id: string;
    title: string;
    icon?: string;
    image?: string; // Optional custom image
    children: ReactNode;
    defaultPosition?: { x: number; y: number };
    defaultSize?: { width: number; height: number };
    minSize?: { width: number; height: number };
    isOpen: boolean;
    onClose: () => void;
    onMinimize?: () => void;
    zIndex?: number;
    onFocus?: () => void;
}

export function DraggablePanel({
    id,
    title,
    icon = '📋',
    image,
    children,
    defaultPosition = { x: 100, y: 100 },
    defaultSize = { width: 340, height: 'auto' as any },
    minSize = { width: 280, height: 100 },
    isOpen,
    onClose,
    onMinimize,
    zIndex = 100,
    onFocus,
}: DraggablePanelProps) {
    const [position, setPosition] = useState(defaultPosition);
    const [size, setSize] = useState(defaultSize);
    const [isMaximized, setIsMaximized] = useState(false);
    const [restoreState, setRestoreState] = useState({ size: defaultSize, position: defaultPosition });
    const [isAnimatingIn, setIsAnimatingIn] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // Button hover states
    const [minimizeHover, setMinimizeHover] = useState(false);
    const [maximizeHover, setMaximizeHover] = useState(false);
    const [closeHover, setCloseHover] = useState(false);

    // Animate in on mount
    useEffect(() => {
        if (isOpen) {
            setIsAnimatingIn(true);
            const timer = setTimeout(() => setIsAnimatingIn(false), 350);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Toggle Maximize
    const toggleMaximize = () => {
        if (isMaximized) {
            setSize(restoreState.size);
            setPosition(restoreState.position);
            onFocus?.();
        } else {
            setRestoreState({ size, position });
            // Maximize to fill viewport with margin
            setSize({ width: window.innerWidth - 20, height: window.innerHeight - 60 });
            setPosition({ x: 10, y: 10 });
            onFocus?.();
        }
        setIsMaximized(!isMaximized);
    };

    // Handle drag start (mouse)
    const handleDragStart = (e: React.MouseEvent) => {
        if (isMaximized) return;
        if ((e.target as HTMLElement).closest('.panel-controls')) return;
        e.preventDefault();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
        onFocus?.();
    };

    // Handle drag start (touch)
    const handleTouchDragStart = (e: React.TouchEvent) => {
        if (isMaximized) return;
        if ((e.target as HTMLElement).closest('.panel-controls')) return;
        const touch = e.touches[0];
        setIsDragging(true);
        setDragOffset({
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        });
        onFocus?.();
    };

    // Handle resize start (mouse)
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        onFocus?.();
    };

    // Handle resize start (touch)
    const handleTouchResizeStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        onFocus?.();
    };

    // Global move handler - optimized for smooth dragging (supports both mouse and touch)
    useEffect(() => {
        let animationFrameId: number | null = null;

        const handleMove = (clientX: number, clientY: number) => {
            if (isDragging) {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);

                animationFrameId = requestAnimationFrame(() => {
                    const panelWidth = typeof size.width === 'number' ? size.width : 340;
                    const newX = Math.max(-panelWidth + 100, Math.min(window.innerWidth - 100, clientX - dragOffset.x));
                    const newY = Math.max(0, Math.min(window.innerHeight - 50, clientY - dragOffset.y));
                    setPosition({ x: newX, y: newY });
                });
            }
            if (isResizing && panelRef.current) {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);

                animationFrameId = requestAnimationFrame(() => {
                    const rect = panelRef.current!.getBoundingClientRect();
                    const newWidth = Math.max(minSize.width, clientX - rect.left);
                    const newHeight = Math.max(minSize.height, clientY - rect.top);
                    setSize({ width: newWidth, height: newHeight });
                });
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging || isResizing) {
                e.preventDefault(); // Prevent scroll while dragging
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }
        };

        const handleEnd = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.body.style.cursor = isDragging ? 'grabbing' : 'nwse-resize';
            document.body.style.userSelect = 'none';
            // Mouse events
            window.addEventListener('mousemove', handleMouseMove, { passive: true });
            window.addEventListener('mouseup', handleEnd);
            // Touch events
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
            window.addEventListener('touchcancel', handleEnd);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleEnd);
        };
    }, [isDragging, isResizing, dragOffset, minSize, size]);

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className={`draggable-panel ${isAnimatingIn ? 'animating-in' : ''}`}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, rgba(10, 20, 15, 0.98) 0%, rgba(15, 30, 20, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: 12,
                boxShadow: isDragging
                    ? '0 0 50px rgba(34, 197, 94, 0.5), 0 30px 60px rgba(0, 0, 0, 0.6)'
                    : '0 0 30px rgba(34, 197, 94, 0.3), 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                userSelect: isDragging ? 'none' : 'auto',
                // GPU acceleration for smooth movement
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                willChange: isDragging || isResizing ? 'transform' : 'auto',
                transition: isDragging || isResizing
                    ? 'transform 0.1s ease, box-shadow 0.1s ease'
                    : isMaximized
                        ? 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        : 'transform 0.2s ease, box-shadow 0.25s ease',
            }}
            onClick={onFocus}
        >
            <style jsx>{`
                @keyframes panelSlideIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.85) translateY(20px);
                    }
                    60% {
                        opacity: 1;
                        transform: scale(1.02) translateY(-5px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .draggable-panel ::-webkit-scrollbar {
                    display: none;
                }
                .draggable-panel.animating-in {
                    animation: panelSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                
                /* Mobile Window Controls */
                @media (max-width: 768px) {
                    .window-minimize-btn {
                        display: none !important;
                    }
                    /* Target the panel-controls div to override inline gap */
                    .draggable-panel .panel-controls {
                        gap: 32px !important;
                    }
                }
            `}</style>
            {/* Title Bar */}
            <div
                className="panel-titlebar"
                onMouseDown={handleDragStart}
                onTouchStart={handleTouchDragStart}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(239, 68, 68, 0.15) 100%)',
                    borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {image ? (
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: '#fff', // White bg for multiply blend
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <img
                                src={image}
                                alt="icon"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    // transform: 'scale(1.2)',
                                    mixBlendMode: 'multiply', // Hides white background
                                    filter: 'contrast(1.1)', // Enhance contrast slightly
                                }}
                            />
                        </div>
                    ) : (
                        <span style={{ fontSize: 16 }}>{icon}</span>
                    )}
                    <span style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#00FFD0',
                        textShadow: '0 0 10px rgba(0, 255, 200, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                    }}>
                        {title}
                    </span>
                </div>
                <div className="panel-controls" style={{ display: 'flex', gap: 6 }}>
                    {onMinimize && (
                        <button
                            className="window-minimize-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMinimize?.();
                            }}
                            onMouseEnter={() => {
                                setMinimizeHover(true);
                            }}
                            onMouseLeave={() => setMinimizeHover(false)}
                            style={{
                                width: 24,
                                height: 24,
                                border: 'none',
                                borderRadius: '50%',
                                background: minimizeHover
                                    ? 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)'
                                    : 'rgba(250, 204, 21, 0.4)',
                                color: minimizeHover ? '#000' : '#facc15',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 'bold',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: minimizeHover ? 'scale(1.2)' : 'scale(1)',
                                boxShadow: minimizeHover
                                    ? '0 0 15px rgba(250, 204, 21, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)'
                                    : '0 0 5px rgba(250, 204, 21, 0.3)',
                            }}
                            title="Minimize"
                        >
                            ─
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleMaximize();
                        }}
                        onMouseEnter={() => {
                            setMaximizeHover(true);
                        }}
                        onMouseLeave={() => setMaximizeHover(false)}
                        style={{
                            width: 24,
                            height: 24,
                            border: 'none',
                            borderRadius: '50%',
                            background: maximizeHover
                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                : 'rgba(34, 197, 94, 0.4)',
                            color: maximizeHover ? '#000' : '#22c55e',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: maximizeHover ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: maximizeHover
                                ? '0 0 15px rgba(34, 197, 94, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)'
                                : '0 0 5px rgba(34, 197, 94, 0.3)',
                        }}
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? '❐' : '□'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        onMouseEnter={() => {
                            setCloseHover(true);
                        }}
                        onMouseLeave={() => setCloseHover(false)}
                        style={{
                            width: 24,
                            height: 24,
                            border: 'none',
                            borderRadius: '50%',
                            background: closeHover
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                : 'rgba(239, 68, 68, 0.4)',
                            color: closeHover ? '#fff' : '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 'bold',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: closeHover ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: closeHover
                                ? '0 0 15px rgba(239, 68, 68, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)'
                                : '0 0 5px rgba(239, 68, 68, 0.3)',
                        }}
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Content */}
            <div
                className="panel-content"
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: 12,
                }}
            >
                <div style={{
                    transform: isMaximized ? 'scale(1.25)' : 'none',
                    transformOrigin: 'top left',
                    width: isMaximized ? '80%' : '100%',
                    minHeight: '100%',
                }}>
                    {children}
                </div>
            </div>

            {/* Resize Handle (Hide when maximized) */}
            {!isMaximized && (
                <div
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleTouchResizeStart}
                    style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: 20,
                        height: 20,
                        cursor: 'nwse-resize',
                        background: 'linear-gradient(135deg, transparent 50%, rgba(139, 92, 246, 0.5) 50%)',
                        borderRadius: '0 0 12px 0',
                    }}
                />
            )}
        </div>
    );
}

// Panel Taskbar for minimized panels
interface PanelTaskbarProps {
    minimizedPanels: Array<{ id: string; title: string; icon: string }>;
    onRestore: (id: string) => void;
}

export function PanelTaskbar({ minimizedPanels, onRestore }: PanelTaskbarProps) {
    if (minimizedPanels.length === 0) return null;

    return (
        <div
            className="panel-taskbar"
            style={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 8,
                padding: '8px 16px',
                background: 'rgba(15, 5, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 16,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
            }}
        >
            {minimizedPanels.map((panel) => (
                <button
                    key={panel.id}
                    onClick={() => {
                        onRestore(panel.id);
                    }}
                    onMouseEnter={() => { }}
                    className="taskbar-panel-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 12,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}
                    title={`Restore ${panel.title}`}
                >
                    <span>{panel.icon}</span>
                    <span>{panel.title}</span>
                    <style jsx>{`
                        .taskbar-panel-btn:hover {
                            transform: translateY(-3px) scale(1.05);
                            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.5), 0 0 15px rgba(139, 92, 246, 0.3);
                            background: linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(168, 85, 247, 0.3) 100%);
                            border-color: rgba(168, 85, 247, 0.7);
                        }
                    `}</style>
                </button>
            ))}
        </div>
    );
}

export default DraggablePanel;
