// Token Distribution 3D Donut Chart with PREMIUM effects
// Orbiting rings, pulse glow, particles, neon borders, hologram effects
"use client";

import React, { useRef, useState, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard, Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useTokenStatsContext, useCustomCamera, createFocusTarget } from "../contexts";
import { SoundManager } from "./SharedEffects";

// Token distribution configuration
const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

interface DistributionSegment {
    id: string;
    label: string;
    amount: number;
    percent: number;
    color: string;
    glowColor: string;
}

interface TokenDistributionChart3DProps {
    position?: [number, number, number];
    size?: number;
    translations?: {
        tokenDistribution: string;
        circulating: string;
        burned: string;
        totalSupply: string;
    };
}

const DEFAULT_TRANSLATIONS = {
    tokenDistribution: "Token Distribution",
    circulating: "Circulating",
    burned: "Burned",
    totalSupply: "Total Supply",
};

// =============================================================================
// ORBITING RING COMPONENT - Glowing rings that rotate around the chart
// =============================================================================
function OrbitingRing({
    radius,
    thickness = 0.03,
    color,
    speed = 1,
    opacity = 0.4,
    tilt = 0
}: {
    radius: number;
    thickness?: number;
    color: string;
    speed?: number;
    opacity?: number;
    tilt?: number;
}) {
    const ringRef = useRef<THREE.Mesh>(null);
    const localTime = useRef(0);

    useFrame((state, delta) => {
        if (ringRef.current) {
            localTime.current += Math.min(delta, 0.1);
            ringRef.current.rotation.z = localTime.current * speed;
        }
    });

    return (
        <mesh ref={ringRef} rotation={[Math.PI / 2 + tilt, 0, 0]}>
            <ringGeometry args={[radius, radius + thickness, 64]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// =============================================================================
// PULSE RING COMPONENT - Expanding rings that fade out
// =============================================================================
function PulseRing({ radius, color }: { radius: number; color: string }) {
    const ringRef = useRef<THREE.Mesh>(null);
    const localTime = useRef(0);

    useFrame((state, delta) => {
        if (!ringRef.current) return;
        localTime.current += Math.min(delta, 0.1);
        const t = (localTime.current % 2.5) / 2.5;
        const scale = 1 + t * 0.8;
        ringRef.current.scale.set(scale, scale, 1);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    });

    return (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius, radius + 0.06, 64]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// =============================================================================
// NEON BORDER COMPONENT - Glowing edge around the donut
// =============================================================================
function NeonBorder({ radius, color, pulseSpeed = 2 }: { radius: number; color: string; pulseSpeed?: number }) {
    const outerRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const localTime = useRef(0);

    useFrame((state, delta) => {
        localTime.current += Math.min(delta, 0.1);
        const intensity = 0.3 + Math.sin(localTime.current * pulseSpeed) * 0.2;
        if (outerRef.current) {
            (outerRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.5;
        }
        if (innerRef.current) {
            (innerRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.3;
        }
    });

    return (
        <>
            {/* Outer neon glow */}
            <mesh ref={outerRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                <ringGeometry args={[radius - 0.02, radius + 0.08, 64]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.25}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Inner neon glow */}
            <mesh ref={innerRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                <ringGeometry args={[radius * 0.48, radius * 0.52, 64]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.15}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </>
    );
}

// =============================================================================
// HOLOGRAM SCAN LINE - Animated scan line effect
// =============================================================================
function HologramScanLine({ radius }: { radius: number }) {
    const lineRef = useRef<THREE.Mesh>(null);
    const localTime = useRef(0);

    useFrame((state, delta) => {
        if (lineRef.current) {
            localTime.current += Math.min(delta, 0.1);
            const y = Math.sin(localTime.current * 1.5) * 0.3;
            lineRef.current.position.y = y;
        }
    });

    return (
        <mesh ref={lineRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, radius * 1.1, 64]} />
            <meshBasicMaterial
                color="#00f2ff"
                transparent
                opacity={0.08}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export function TokenDistributionChart3D({
    position = [0, -2, 0],
    size = 1.8,
    translations = DEFAULT_TRANSLATIONS
}: TokenDistributionChart3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
    const glowPhaseRef = useRef(0);
    const rotationYRef = useRef(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [hoveredHolder, setHoveredHolder] = useState<string | null>(null);
    const { stats, advancedInfo } = useTokenStatsContext();
    const { focusOn } = useCustomCamera();

    // Handle panel close with animation
    const handlePanelClose = useCallback(() => {
        SoundManager.playClose();
        setIsClosing(true);
        setTimeout(() => {
            setIsPanelVisible(false);
            setIsClosing(false);
        }, 350); // Match animation duration
    }, []);

    // Single click = toggle panel, Double click = focus camera
    const handleChartClick = useCallback(() => {
        if (isPanelVisible) {
            handlePanelClose();
        } else {
            SoundManager.playClick();
            setIsPanelVisible(true);
        }
    }, [isPanelVisible, handlePanelClose]);

    const handleChartDoubleClick = useCallback(() => {
        const focusTarget = createFocusTarget(position as [number, number, number], 5, 0);
        focusOn(focusTarget, 0.8);
    }, [position, focusOn]);

    // Color palette for top 20 holders (gradient from gold to purple)
    const HOLDER_COLORS = useMemo(() => [
        { color: "#facc15", glow: "#eab308" }, // 1 - gold
        { color: "#fbbf24", glow: "#d97706" }, // 2
        { color: "#f59e0b", glow: "#b45309" }, // 3
        { color: "#fb923c", glow: "#c2410c" }, // 4
        { color: "#f97316", glow: "#9a3412" }, // 5
        { color: "#fb7185", glow: "#be123c" }, // 6
        { color: "#f472b6", glow: "#a21caf" }, // 7
        { color: "#e879f9", glow: "#86198f" }, // 8
        { color: "#c084fc", glow: "#7c3aed" }, // 9
        { color: "#a78bfa", glow: "#6d28d9" }, // 10
        { color: "#818cf8", glow: "#4f46e5" }, // 11
        { color: "#60a5fa", glow: "#2563eb" }, // 12
        { color: "#38bdf8", glow: "#0284c7" }, // 13
        { color: "#22d3ee", glow: "#0891b2" }, // 14
        { color: "#2dd4bf", glow: "#0d9488" }, // 15
        { color: "#34d399", glow: "#059669" }, // 16
        { color: "#4ade80", glow: "#16a34a" }, // 17
        { color: "#a3e635", glow: "#65a30d" }, // 18
        { color: "#84cc16", glow: "#4d7c0f" }, // 19
        { color: "#bef264", glow: "#84cc16" }, // 20
    ], []);

    const BLACK_HOLE = "0x8f00767450fd12fd1329b11b78be7340be2584ea";

    // Store full holders list
    interface HolderInfo {
        address: string;
        shortAddress: string;
        amount: number;
        isBlackHole: boolean;
    }
    const [holdersInfo, setHoldersInfo] = useState<HolderInfo[]>([]);
    const [blackHoleAmount, setBlackHoleAmount] = useState(0);

    React.useEffect(() => {
        let isMounted = true;

        async function fetchTop20(retryCount = 0) {
            try {
                const res = await fetch('/api/okx/holders');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (data.success && data.holders && isMounted) {
                    const holders: HolderInfo[] = [];
                    let bhAmount = 0;

                    data.holders.slice(0, 20).forEach((h: any) => {
                        const addr = h.holderWalletAddress || '';
                        const amount = parseFloat(h.holdAmount || '0');
                        const isBlackHole = addr.toLowerCase() === BLACK_HOLE.toLowerCase();

                        if (isBlackHole) {
                            bhAmount = amount;
                        } else {
                            holders.push({
                                address: addr,
                                shortAddress: addr.slice(0, 6) + '...' + addr.slice(-4),
                                amount: amount,
                                isBlackHole: false
                            });
                        }
                    });

                    setHoldersInfo(holders);
                    setBlackHoleAmount(bhAmount);
                }
            } catch (e) {
                console.error('Holders fetch error:', e);
                // Retry with exponential backoff (max 2 retries)
                if (retryCount < 2 && isMounted) {
                    const delay = retryCount === 0 ? 2000 : 5000;
                    setTimeout(() => fetchTop20(retryCount + 1), delay);
                }
            }
        }

        fetchTop20();
        const interval = setInterval(() => {
            if (isMounted) fetchTop20();
        }, 5 * 60 * 1000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // Animation
    const localTime = useRef(0);
    useFrame((state, delta) => {
        const clampedDelta = Math.min(delta, 0.1);
        localTime.current += clampedDelta;
        if (groupRef.current) {
            groupRef.current.rotation.y = localTime.current * 0.08;
            groupRef.current.position.y = position[1] + Math.sin(localTime.current * 0.4) * 0.08;
        }
        glowPhaseRef.current = Math.sin(localTime.current * 2) * 0.5 + 0.5;
        rotationYRef.current = localTime.current;
    });

    // Calculate distribution - Top 5 holders individually, rest grouped
    const segments: DistributionSegment[] = useMemo(() => {
        const circSupplyFromAPI = stats?.circSupply
            ? parseFloat(stats.circSupply)
            : 850_000_000;

        const circulating = Math.min(circSupplyFromAPI, TOTAL_SUPPLY);
        // Burned includes black hole address
        const burned = (TOTAL_SUPPLY - circulating) + blackHoleAmount;

        // Split into Top 5 and rest
        const top5 = holdersInfo.slice(0, 5);
        const rest = holdersInfo.slice(5);
        const restTotal = rest.reduce((sum, h) => sum + h.amount, 0);
        const top5Total = top5.reduce((sum, h) => sum + h.amount, 0);

        // Others = circulating minus all holders
        const othersAmount = circulating - top5Total - restTotal - blackHoleAmount;

        const result: DistributionSegment[] = [
            {
                id: "burned",
                label: `🔥 ${translations.burned}`,
                amount: burned,
                percent: (burned / TOTAL_SUPPLY) * 100,
                color: "#ef4444",
                glowColor: "#dc2626",
            },
        ];

        // Add Top 5 holders individually
        top5.forEach((holder, i) => {
            const colorPair = HOLDER_COLORS[i];
            result.push({
                id: `holder-${i}`,
                label: `#${i + 1} ${holder.shortAddress}`,
                amount: holder.amount,
                percent: (holder.amount / TOTAL_SUPPLY) * 100,
                color: colorPair.color,
                glowColor: colorPair.glow,
            });
        });

        // Group #6-20 into one segment
        if (rest.length > 0) {
            result.push({
                id: "top6-20",
                label: `🐋 #6-${5 + rest.length}`,
                amount: restTotal,
                percent: (restTotal / TOTAL_SUPPLY) * 100,
                color: "#a78bfa",
                glowColor: "#7c3aed",
            });
        }

        // Add Others segment
        result.push({
            id: "others",
            label: "👥 Others",
            amount: othersAmount,
            percent: (othersAmount / TOTAL_SUPPLY) * 100,
            color: "#4ade80",
            glowColor: "#22c55e",
        });

        return result;
    }, [stats, translations, holdersInfo, blackHoleAmount, HOLDER_COLORS]);

    const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString();
    };


    // Copy wallet address with fallback
    const copyAddress = async (address: string) => {
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(address);
            } else {
                // Fallback for older browsers or restricted contexts
                const textArea = document.createElement('textarea');
                textArea.value = address;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedAddress(address);
            setTimeout(() => setCopiedAddress(null), 2000);
        } catch (e) { console.error('Copy failed:', e); }
    };

    // Get rest holders for expand view
    const restHolders = holdersInfo.slice(5);

    // Geometry settings
    let startAngle = 0;
    const innerRadius = size * 0.5;
    const outerRadius = size;
    const thickness = 0.4;

    return (
        <>
            <group ref={groupRef} position={position}>

                {/* Invisible hit area - single click = toggle panel, double click = focus */}
                <mesh position={[0, 0.5, 0.2]} onClick={handleChartClick} onDoubleClick={handleChartDoubleClick}>
                    <planeGeometry args={[size * 2.5, size * 2.5]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* ==================== PREMIUM EFFECTS ==================== */}

                {/* Pulse Rings - Expanding gold waves only */}
                <PulseRing radius={size * 1.05} color="#facc15" />
                <group rotation={[0, Math.PI * 0.66, 0]}>
                    <PulseRing radius={size * 1.12} color="#facc15" />
                </group>
                <group rotation={[0, Math.PI * 1.33, 0]}>
                    <PulseRing radius={size * 1.2} color="#facc15" />
                </group>

                {/* Sparkle Particles - Gold only */}
                <Sparkles
                    count={50}
                    scale={[size * 3, 1.2, size * 3]}
                    size={2.5}
                    speed={0.4}
                    color="#facc15"
                    opacity={0.7}
                />

                {/* ==================== ORGANIC DONUT SEGMENTS ==================== */}
                {segments.map((seg, i) => {
                    const angle = (seg.percent / 100) * Math.PI * 2;
                    const midAngle = startAngle + angle / 2;
                    const isHovered = hoveredSegment === seg.id;

                    // Organic breathing offset per segment (different phase for each)
                    const breathPhase = glowPhaseRef.current + i * 0.3;
                    const breathScale = 1 + Math.sin(breathPhase * Math.PI * 2) * 0.02;
                    const breathY = Math.sin(breathPhase * Math.PI * 2 + i) * 0.03;

                    const hoverOffset = isHovered ? 0.15 : 0;

                    // Improved label positioning - spread out more, alternating heights
                    const labelRadius = outerRadius + 0.9 + (i % 2) * 0.3;
                    const labelHeight = 0.5 + (i % 3) * 0.15 - (i % 2) * 0.1;
                    const labelPos: [number, number, number] = [
                        Math.sin(midAngle) * labelRadius,
                        labelHeight,
                        Math.cos(midAngle) * labelRadius
                    ];

                    const offsetX = Math.sin(midAngle) * hoverOffset;
                    const offsetZ = Math.cos(midAngle) * hoverOffset;

                    const element = (
                        <group key={seg.id}>
                            {/* Main segment with organic breathing */}
                            <group
                                position={[offsetX, (isHovered ? 0.15 : 0) + breathY, offsetZ]}
                                scale={[breathScale, 1, breathScale]}
                            >
                                {/* Outer rounded edge glow */}
                                <mesh rotation={[0, startAngle, 0]} position={[0, thickness * 0.6, 0]}>
                                    <cylinderGeometry
                                        args={[outerRadius + 0.05, outerRadius + 0.05, 0.08, 64, 1, false, 0, angle]}
                                    />
                                    <meshBasicMaterial
                                        color={seg.glowColor}
                                        transparent
                                        opacity={isHovered ? 0.8 : 0.3 + glowPhaseRef.current * 0.2}
                                    />
                                </mesh>

                                {/* Main segment body - smoother with more segments */}
                                <mesh
                                    rotation={[0, startAngle, 0]}
                                    onClick={handleChartClick}
                                    onPointerEnter={() => { setHoveredSegment(seg.id); SoundManager.playPieHover(seg.percent); }}
                                    onPointerLeave={() => setHoveredSegment(null)}
                                >
                                    <cylinderGeometry
                                        args={[outerRadius, outerRadius * 0.98, thickness, 128, 1, false, 0, angle]}
                                    />
                                    <meshStandardMaterial
                                        color={seg.color}
                                        emissive={seg.glowColor}
                                        emissiveIntensity={isHovered ? 1.2 : 0.4 + glowPhaseRef.current * 0.3}
                                        metalness={0.5}
                                        roughness={0.3}
                                    />
                                </mesh>

                                {/* Inner rounded edge glow */}
                                <mesh rotation={[0, startAngle, 0]} position={[0, thickness * 0.6, 0]}>
                                    <cylinderGeometry
                                        args={[innerRadius - 0.02, innerRadius - 0.02, 0.06, 64, 1, false, 0, angle]}
                                    />
                                    <meshBasicMaterial
                                        color={seg.color}
                                        transparent
                                        opacity={0.5}
                                    />
                                </mesh>

                                {/* Inner cutout - clean hollow center */}
                                <mesh rotation={[0, startAngle, 0]} position={[0, 0, 0]}>
                                    <cylinderGeometry
                                        args={[innerRadius, innerRadius, thickness + 0.1, 128, 1, false, 0, angle]}
                                    />
                                    <meshBasicMaterial color="#050510" />
                                </mesh>

                                {/* Bottom cap glow for organic feel */}
                                <mesh rotation={[0, startAngle, 0]} position={[0, -thickness * 0.55, 0]}>
                                    <cylinderGeometry
                                        args={[outerRadius, outerRadius, 0.05, 64, 1, false, 0, angle]}
                                    />
                                    <meshBasicMaterial
                                        color={seg.glowColor}
                                        transparent
                                        opacity={0.2}
                                    />
                                </mesh>
                            </group>

                            {/* Percentage label - improved visibility with rounded background */}
                            <Billboard position={labelPos}>
                                <Html center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleChartClick(); }}
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.75)',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            border: `1px solid ${isHovered ? '#ffffff' : seg.color}40`,
                                            boxShadow: isHovered ? `0 0 12px ${seg.color}60` : 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                        }}
                                    >
                                        <span style={{
                                            color: isHovered ? '#ffffff' : seg.color,
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            fontFamily: "'Space Mono', monospace",
                                            textShadow: `0 0 8px ${seg.color}80`,
                                        }}>
                                            {seg.percent.toFixed(1)}%
                                        </span>
                                    </div>
                                </Html>
                            </Billboard>

                            {/* Floating particle effect on hover */}
                            {isHovered && (
                                <Sparkles
                                    position={[Math.sin(midAngle) * outerRadius * 0.75, 0.2, Math.cos(midAngle) * outerRadius * 0.75]}
                                    count={15}
                                    scale={[0.8, 0.5, 0.8]}
                                    size={3}
                                    speed={1}
                                    color={seg.color}
                                />
                            )}
                        </group>
                    );

                    startAngle += angle;
                    return element;
                })}

                {/* ==================== LIVING CENTER CORE ==================== */}

                {/* Breathing center orb - pulsing like a heartbeat */}
                <mesh position={[0, 0, 0]} scale={[1 + glowPhaseRef.current * 0.15, 1 + glowPhaseRef.current * 0.15, 1 + glowPhaseRef.current * 0.15]}>
                    <sphereGeometry args={[innerRadius * 0.35, 64, 64]} />
                    <meshStandardMaterial
                        color="#facc15"
                        emissive="#f59e0b"
                        emissiveIntensity={0.3 + glowPhaseRef.current * 0.4}
                        transparent
                        opacity={0.25 + glowPhaseRef.current * 0.15}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>

                {/* Inner energy core */}
                <mesh position={[0, 0, 0]} scale={[1 + glowPhaseRef.current * 0.3, 1 + glowPhaseRef.current * 0.3, 1 + glowPhaseRef.current * 0.3]}>
                    <sphereGeometry args={[innerRadius * 0.15, 32, 32]} />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.5 + glowPhaseRef.current * 0.3}
                    />
                </mesh>

                {/* Multiple rotating energy rings */}
                <mesh rotation={[Math.PI / 2, 0, rotationYRef.current * 0.8]} position={[0, 0, 0]}>
                    <ringGeometry args={[innerRadius * 0.4, innerRadius * 0.45, 64]} />
                    <meshBasicMaterial
                        color="#facc15"
                        transparent
                        opacity={0.5 + glowPhaseRef.current * 0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                <mesh rotation={[Math.PI / 2 + 0.3, rotationYRef.current * -0.5, 0]} position={[0, 0, 0]}>
                    <ringGeometry args={[innerRadius * 0.5, innerRadius * 0.53, 64]} />
                    <meshBasicMaterial
                        color="#22d3ee"
                        transparent
                        opacity={0.3 + glowPhaseRef.current * 0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                <mesh rotation={[Math.PI / 2 - 0.4, 0, rotationYRef.current * 0.6]} position={[0, 0, 0]}>
                    <ringGeometry args={[innerRadius * 0.58, innerRadius * 0.6, 64]} />
                    <meshBasicMaterial
                        color="#a78bfa"
                        transparent
                        opacity={0.25 + glowPhaseRef.current * 0.15}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* Total Supply label */}
                <Billboard position={[0, 0.12, 0]}>
                    <Text
                        fontSize={0.1}
                        color="#8892a8"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {translations.totalSupply}
                    </Text>
                </Billboard>
                <Billboard position={[0, -0.1, 0]}>
                    <Text
                        fontSize={0.25}
                        color="#facc15"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.01}
                        outlineColor="#000000"
                    >
                        1B
                    </Text>
                </Billboard>

                {/* Top 10 Holders % label */}
                {advancedInfo?.top10HoldPercent && (
                    <Billboard position={[0, -0.32, 0]}>
                        <Text
                            fontSize={0.08}
                            color="#c084fc"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.003}
                            outlineColor="#000000"
                        >
                            {`Top10: ${parseFloat(advancedInfo.top10HoldPercent).toFixed(1)}%`}
                        </Text>
                    </Billboard>
                )}

                {/* Interactive hover detection */}
                {
                    segments.map((seg, i) => {
                        const angle = (seg.percent / 100) * Math.PI * 2;
                        const prevAngles = segments.slice(0, i).reduce((sum, s) => sum + (s.percent / 100) * Math.PI * 2, 0);
                        const midAngle = prevAngles + angle / 2;

                        return (
                            <mesh
                                key={`hover-${seg.id}`}
                                position={[
                                    Math.sin(midAngle) * (size * 0.75),
                                    0,
                                    Math.cos(midAngle) * (size * 0.75)
                                ]}
                                onClick={handleChartClick}
                                onPointerEnter={() => { setHoveredSegment(seg.id); SoundManager.playPieHover(seg.percent); }}
                                onPointerLeave={() => setHoveredSegment(null)}
                            >
                                <sphereGeometry args={[0.35, 8, 8]} />
                                <meshBasicMaterial visible={false} />
                            </mesh>
                        );
                    })
                }
            </group>

            {/* ==================== LEGEND PANEL (outside rotating group) ==================== */}
            {isPanelVisible && (
                <Billboard position={[position[0] + 4, position[1] + 2, position[2]]}>
                    <Html
                        distanceFactor={10}
                        style={{ pointerEvents: 'auto' }}
                        center
                    >
                        <div
                            className={isClosing ? 'panel-closing' : 'panel-opening'}
                            style={{
                                background: 'linear-gradient(135deg, rgba(10, 10, 35, 0.95) 0%, rgba(20, 20, 50, 0.9) 100%)',
                                border: '1px solid rgba(250, 204, 21, 0.5)',
                                borderRadius: '16px',
                                padding: '16px 22px',
                                minWidth: '340px',
                                maxWidth: '380px',
                                fontFamily: "'Space Mono', monospace",
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 0 60px rgba(250, 204, 21, 0.3), 0 0 100px rgba(168, 85, 247, 0.15), 0 8px 32px rgba(0, 0, 0, 0.6)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            <style>{`
                                /* === OPENING ANIMATION === */
                                .panel-opening {
                                    animation: hologramOpen 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                                               glowPulse 3s ease-in-out 0.5s infinite,
                                               scanlineEffect 4s linear infinite;
                                }
                                
                                @keyframes hologramOpen {
                                    0% { 
                                        opacity: 0; 
                                        transform: perspective(800px) rotateY(-30deg) translateX(60px) scale(0.7);
                                        filter: blur(10px) brightness(2);
                                    }
                                    50% {
                                        opacity: 0.8;
                                        transform: perspective(800px) rotateY(5deg) translateX(-10px) scale(1.02);
                                        filter: blur(2px) brightness(1.3);
                                    }
                                    100% { 
                                        opacity: 1; 
                                        transform: perspective(800px) rotateY(0) translateX(0) scale(1);
                                        filter: blur(0) brightness(1);
                                    }
                                }
                                
                                /* === CLOSING ANIMATION === */
                                .panel-closing {
                                    animation: hologramClose 0.35s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards;
                                }
                                
                                @keyframes hologramClose {
                                    0% { 
                                        opacity: 1; 
                                        transform: perspective(800px) rotateY(0) translateX(0) scale(1);
                                        filter: blur(0) brightness(1);
                                    }
                                    40% {
                                        opacity: 0.7;
                                        transform: perspective(800px) rotateY(-5deg) translateX(-15px) scale(1.05);
                                        filter: blur(1px) brightness(1.5);
                                    }
                                    100% { 
                                        opacity: 0; 
                                        transform: perspective(800px) rotateY(20deg) translateX(80px) scale(0.5);
                                        filter: blur(15px) brightness(3);
                                    }
                                }
                                
                                /* === GLOW PULSE === */
                                @keyframes glowPulse {
                                    0%, 100% { 
                                        box-shadow: 0 0 40px rgba(250, 204, 21, 0.25), 0 0 80px rgba(168, 85, 247, 0.1), 0 8px 32px rgba(0, 0, 0, 0.5);
                                    }
                                    50% { 
                                        box-shadow: 0 0 70px rgba(250, 204, 21, 0.4), 0 0 120px rgba(168, 85, 247, 0.2), 0 8px 32px rgba(0, 0, 0, 0.5);
                                    }
                                }
                                
                                /* === SCANLINE EFFECT === */
                                @keyframes scanlineEffect {
                                    0% { background-position: 0 0; }
                                    100% { background-position: 0 100%; }
                                }
                                
                                .panel-opening::before, .panel-closing::before {
                                    content: '';
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background: linear-gradient(
                                        transparent 0%,
                                        rgba(250, 204, 21, 0.03) 50%,
                                        transparent 100%
                                    );
                                    background-size: 100% 8px;
                                    pointer-events: none;
                                    animation: scanMove 3s linear infinite;
                                }
                                
                                @keyframes scanMove {
                                    0% { transform: translateY(-100%); }
                                    100% { transform: translateY(100%); }
                                }
                                
                                /* === CLOSE BUTTON HOVER === */
                                .close-btn-anim {
                                    transition: all 0.2s ease;
                                }
                                .close-btn-anim:hover {
                                    transform: scale(1.2) rotate(90deg);
                                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
                                }
                            `}</style>

                            {/* Hologram corner decorations */}
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                width: '20px', height: '20px',
                                borderTop: '2px solid #facc15',
                                borderLeft: '2px solid #facc15',
                                borderTopLeftRadius: '14px',
                            }} />
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                width: '20px', height: '20px',
                                borderTop: '2px solid #facc15',
                                borderRight: '2px solid #facc15',
                                borderTopRightRadius: '14px',
                            }} />
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0,
                                width: '20px', height: '20px',
                                borderBottom: '2px solid #a78bfa',
                                borderLeft: '2px solid #a78bfa',
                                borderBottomLeftRadius: '14px',
                            }} />
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: '20px', height: '20px',
                                borderBottom: '2px solid #a78bfa',
                                borderRight: '2px solid #a78bfa',
                                borderBottomRightRadius: '14px',
                            }} />

                            <button
                                className="close-btn-anim"
                                onClick={handlePanelClose}
                                style={{
                                    position: 'absolute', top: '8px', right: '8px',
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    border: '1px solid #fca5a5',
                                    color: '#fff',
                                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                                }}
                            >✕</button>
                            <div style={{
                                fontSize: '10px', color: '#facc15', marginBottom: '12px',
                                textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center',
                                borderBottom: '1px solid rgba(250, 204, 21, 0.2)', paddingBottom: '10px', fontWeight: 600,
                            }}>
                                ◈ {translations.tokenDistribution} ◈
                            </div>
                            <div
                                className="token-distribution-scroll"
                                onWheel={(e) => e.stopPropagation()}
                                style={{
                                    maxHeight: '350px',
                                    overflowY: 'auto',
                                    scrollbarWidth: 'none', /* Firefox */
                                    msOverflowStyle: 'none', /* IE/Edge */
                                }}
                            >
                                <style>{`
                                    .token-distribution-scroll::-webkit-scrollbar {
                                        display: none; /* Chrome, Safari, Opera */
                                    }
                                `}</style>
                                {segments.map((seg) => {
                                    const holderIndex = seg.id.startsWith('holder-') ? parseInt(seg.id.split('-')[1]) : -1;
                                    const holder = holderIndex >= 0 ? holdersInfo[holderIndex] : null;
                                    const isCopied = holder && copiedAddress === holder.address;
                                    const isTop620 = seg.id === 'top6-20';
                                    return (
                                        <div key={seg.id}>
                                            <div
                                                onMouseEnter={() => {
                                                    setHoveredSegment(seg.id);
                                                    SoundManager.playHover();
                                                    if (holder) setHoveredHolder(holder.address);
                                                }}
                                                onMouseLeave={() => { setHoveredSegment(null); setHoveredHolder(null); }}
                                                onClick={() => {
                                                    if (isTop620) setIsExpanded(!isExpanded);
                                                    else if (holder) copyAddress(holder.address);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: hoveredSegment === seg.id ? '8px 6px' : '6px 4px',
                                                    cursor: holder || isTop620 ? 'pointer' : 'default',
                                                    opacity: hoveredSegment === seg.id ? 1 : 0.85,
                                                    borderRadius: '6px',
                                                    background: hoveredSegment === seg.id
                                                        ? 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(168,85,247,0.1) 100%)'
                                                        : 'transparent',
                                                    transition: 'all 0.2s ease',
                                                    transform: hoveredSegment === seg.id ? 'scale(1.02)' : 'scale(1)',
                                                    boxShadow: hoveredSegment === seg.id ? '0 0 15px rgba(250,204,21,0.2)' : 'none',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{
                                                        width: hoveredSegment === seg.id ? '10px' : '8px',
                                                        height: hoveredSegment === seg.id ? '10px' : '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: seg.color,
                                                        boxShadow: hoveredSegment === seg.id ? `0 0 8px ${seg.color}` : 'none',
                                                        transition: 'all 0.2s ease',
                                                    }} />
                                                    <span style={{
                                                        fontSize: hoveredSegment === seg.id ? '11px' : '10px',
                                                        color: hoveredSegment === seg.id ? '#fff' : '#bbc',
                                                        fontWeight: hoveredSegment === seg.id ? 600 : 400,
                                                        transition: 'all 0.2s ease',
                                                    }}>
                                                        {seg.label} {isTop620 && (isExpanded ? '▼' : '►')}
                                                    </span>
                                                    {holder && <span style={{ fontSize: '8px', color: isCopied ? '#4ade80' : '#666' }}>{isCopied ? '✓' : '📋'}</span>}
                                                </div>
                                                <span style={{
                                                    fontSize: hoveredSegment === seg.id ? '13px' : '9px',
                                                    color: hoveredSegment === seg.id ? '#facc15' : seg.color,
                                                    fontWeight: 700,
                                                    textShadow: hoveredSegment === seg.id ? '0 0 10px rgba(250,204,21,0.5)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                }}>{formatNumber(seg.amount)}</span>
                                            </div>
                                            {isTop620 && isExpanded && (
                                                <div style={{ marginLeft: '14px', borderLeft: '2px solid #a78bfa', paddingLeft: '6px' }}>
                                                    {restHolders.map((h, i) => {
                                                        const isHold = hoveredHolder === h.address;
                                                        return (
                                                            <div
                                                                key={h.address}
                                                                onClick={() => copyAddress(h.address)}
                                                                onMouseEnter={() => { setHoveredHolder(h.address); SoundManager.playHover(); }}
                                                                onMouseLeave={() => setHoveredHolder(null)}
                                                                style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: isHold ? '5px 4px' : '3px 0',
                                                                    cursor: 'pointer',
                                                                    fontSize: isHold ? '10px' : '9px',
                                                                    color: copiedAddress === h.address ? '#4ade80' : isHold ? '#fff' : '#888',
                                                                    background: isHold ? 'rgba(168,85,247,0.15)' : 'transparent',
                                                                    borderRadius: '4px',
                                                                    transition: 'all 0.2s ease',
                                                                    transform: isHold ? 'scale(1.02)' : 'scale(1)',
                                                                }}
                                                            >
                                                                <span>#{i + 6} {h.shortAddress} {copiedAddress === h.address ? '✓' : '📋'}</span>
                                                                <span style={{
                                                                    color: isHold ? '#facc15' : '#a78bfa',
                                                                    fontSize: isHold ? '12px' : '9px',
                                                                    fontWeight: isHold ? 700 : 400,
                                                                    textShadow: isHold ? '0 0 8px rgba(250,204,21,0.4)' : 'none',
                                                                    transition: 'all 0.2s ease',
                                                                }}>{formatNumber(h.amount)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Html>
                </Billboard>
            )}
        </>
    );
}

export default TokenDistributionChart3D;
