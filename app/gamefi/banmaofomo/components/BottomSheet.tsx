/**
 * BottomSheet Component - Swipeable Mobile Bottom Sheet
 * Uses bottom-anchored approach: animate HEIGHT instead of Y-translate
 * This ensures the content area = visible area = scrollable area
 */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, PanInfo } from "framer-motion";

interface BottomSheetProps {
    children: React.ReactNode;
    title?: string;
    peekHeight?: number;
    swipeUpText?: string;
    swipeDownText?: string;
    "data-tour"?: string;
}

const PEEK_HEIGHT = 52;        // collapsed: just handle + title
const HALF_PERCENT = 55;       // 55% of viewport
const FULL_PERCENT = 93;       // 93% of viewport

export default function BottomSheet({
    children,
    title = "Round Info",
    peekHeight = PEEK_HEIGHT,
    swipeUpText = "↑ Vuốt lên",
    swipeDownText = "↓ Vuốt xuống",
    "data-tour": dataTour,
}: BottomSheetProps) {
    const [snapState, setSnapState] = useState<"collapsed" | "half" | "full">("collapsed");
    const [windowHeight, setWindowHeight] = useState(800);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setWindowHeight(window.innerHeight);
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Height for each snap state
    const getHeight = useCallback((state: "collapsed" | "half" | "full") => {
        switch (state) {
            case "collapsed": return peekHeight;
            case "half": return Math.round(windowHeight * HALF_PERCENT / 100);
            case "full": return Math.round(windowHeight * FULL_PERCENT / 100);
        }
    }, [windowHeight, peekHeight]);

    const currentHeight = getHeight(snapState);
    const handleHeight = 50; // approx handle area height

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const velocity = info.velocity.y;

        // Fast swipe up (negative y = upward)
        if (velocity < -400) {
            setSnapState(snapState === "collapsed" ? "half" : "full");
            return;
        }
        // Fast swipe down
        if (velocity > 400) {
            setSnapState(snapState === "full" ? "half" : "collapsed");
            return;
        }

        // Slow drag: use offset to determine intent
        const offset = info.offset.y;
        if (offset < -50) {
            // Dragged up
            setSnapState(snapState === "collapsed" ? "half" : "full");
        } else if (offset > 50) {
            // Dragged down
            setSnapState(snapState === "full" ? "half" : "collapsed");
        }
        // else: stay at current state (small drag)
    };

    const handleTap = () => {
        if (snapState === "collapsed") setSnapState("half");
        else setSnapState("collapsed");
    };

    return (
        <>
            {/* Backdrop */}
            {snapState !== "collapsed" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: snapState === "full" ? 0.5 : 0.3 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSnapState("collapsed")}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "black",
                        zIndex: 998,
                    }}
                />
            )}

            {/* Sheet — anchored at BOTTOM, height animated */}
            <motion.div
                data-tour={dataTour}
                animate={{ height: currentHeight }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    background: "linear-gradient(180deg, rgba(20, 20, 30, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)",
                    borderTopLeftRadius: "20px",
                    borderTopRightRadius: "20px",
                    boxShadow: "0 -4px 30px rgba(0, 0, 0, 0.5)",
                    border: "1px solid rgba(255, 215, 0, 0.15)",
                    borderBottom: "none",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Drag Handle — ONLY this area responds to drag */}
                <motion.div
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0}
                    onDragEnd={handleDragEnd}
                    onClick={handleTap}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "8px 16px 6px",
                        cursor: "grab",
                        flexShrink: 0,
                        touchAction: "none",
                        userSelect: "none",
                    }}
                >
                    <div
                        style={{
                            width: "36px",
                            height: "4px",
                            borderRadius: "2px",
                            background: "rgba(255, 255, 255, 0.3)",
                            marginBottom: "6px",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                        }}
                    >
                        <span style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#ffd700",
                            letterSpacing: "0.5px",
                        }}>
                            {title}
                        </span>
                        <span style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.4)",
                        }}>
                            {snapState === "collapsed" ? swipeUpText : swipeDownText}
                        </span>
                    </div>
                </motion.div>

                {/* Content — scrollable, properly sized */}
                <div
                    ref={contentRef}
                    style={{
                        flex: 1,
                        minHeight: 0, // critical for flex scroll
                        overflow: snapState === "collapsed" ? "hidden" : "auto",
                        overflowX: "hidden",
                        overscrollBehavior: "contain",
                        WebkitOverflowScrolling: "touch",
                        padding: "0 6px 20px",
                    }}
                >
                    {children}
                </div>
            </motion.div>
        </>
    );
}
