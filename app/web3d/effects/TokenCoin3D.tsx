"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useWeb3DTheme, useCustomCamera, createFocusTarget } from "../contexts";

interface TokenCoin3DProps {
    position?: [number, number, number];
    size?: number;
    rotationSpeed?: number;
}

// Easing functions
const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// Sound Manager for coin effects
class CoinSoundManager {
    private static audioContext: AudioContext | null = null;
    private static initialized = false;
    private static jingleLoopId: NodeJS.Timeout | null = null;

    static init() {
        if (this.initialized || typeof window === 'undefined') return;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.initialized = true;
    }

    static playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) { /* silent */ }
    }

    static playClink() {
        this.playTone(2500, 0.15, 'triangle', 0.08);
        setTimeout(() => this.playTone(3200, 0.1, 'sine', 0.05), 30);
        setTimeout(() => this.playTone(4000, 0.08, 'sine', 0.03), 60);
    }

    static playShimmer() {
        this.playTone(1200, 0.3, 'sine', 0.03);
        setTimeout(() => this.playTone(1500, 0.25, 'sine', 0.02), 50);
    }

    // Single jingle sound pattern - coin clinking
    static playJingle() {
        this.playTone(2000, 0.12, 'triangle', 0.06);      // High clink
        setTimeout(() => this.playTone(2800, 0.1, 'sine', 0.05), 120);   // Sparkle
        setTimeout(() => this.playTone(1600, 0.15, 'triangle', 0.05), 240); // Mid clink
        setTimeout(() => this.playTone(3200, 0.08, 'sine', 0.04), 360);  // High shimmer
        setTimeout(() => this.playTone(1800, 0.12, 'triangle', 0.05), 480); // Another clink
        setTimeout(() => this.playTone(2400, 0.1, 'sine', 0.04), 600);   // Finish sparkle
    }

    // Start continuous jingle loop
    static startJingleLoop() {
        this.stopJingleLoop();
        this.playJingle();
        this.jingleLoopId = setInterval(() => {
            this.playJingle();
        }, 800);
    }

    // Stop jingle loop
    static stopJingleLoop() {
        if (this.jingleLoopId) {
            clearInterval(this.jingleLoopId);
            this.jingleLoopId = null;
        }
    }

    static playWhoosh() {
        if (!this.audioContext) this.init();
        if (!this.audioContext) return;
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);
        } catch (e) { /* silent */ }
    }

    static playSuccess() {
        this.playTone(523, 0.1, 'sine', 0.06);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.05), 80);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.04), 160);
    }
}

export function TokenCoin3D({
    position = [0, 0, 0],
    size = 1.5,
    rotationSpeed = 0.5,
}: TokenCoin3DProps) {
    const coinRef = useRef<THREE.Group>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSpawned, setIsSpawned] = useState(false);

    const flipProgress = useRef(0);
    const flipTarget = useRef(0);
    const currentFace = useRef(0);
    const hoverScale = useRef(1);
    const glowIntensity = useRef(0.15);
    const spawnProgress = useRef(0);
    const mousePosition = useRef({ x: 0, y: 0 });
    const tiltX = useRef(0);
    const tiltZ = useRef(0);
    const wasHovered = useRef(false);

    const { theme, primaryColor } = useWeb3DTheme();
    const { focusOn } = useCustomCamera();
    const { gl } = useThree();

    const coinColors = useMemo(() => theme === "gold"
        ? {
            main: "#FFD700", edge: "#B8860B", shine: "#FFFACD",
            glow: "#FFA500", particle: "#FFE4B5",
            confetti: ["#FFD700", "#FFA500", "#FF6347", "#FFE4B5", "#FFFACD"]
        }
        : {
            main: "#00F3FF", edge: "#0099AA", shine: "#E0FFFF",
            glow: "#00BFFF", particle: "#87CEEB",
            confetti: ["#00F3FF", "#00BFFF", "#87CEEB", "#E0FFFF", "#FF69B4"]
        }, [theme]);

    const baseTilt = Math.PI * 0.45;
    const coinThickness = size * 0.12;

    useEffect(() => { CoinSoundManager.init(); }, []);
    useEffect(() => {
        const timer = setTimeout(() => setIsSpawned(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            mousePosition.current = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [gl]);

    const localTime = useRef(0);
    useFrame((state, rawDelta) => {
        if (!coinRef.current) return;
        // Clamp delta to prevent massive jumps after tab inactivity
        const delta = Math.min(rawDelta, 0.1);
        localTime.current += delta;
        const time = localTime.current;

        // Spawn animation
        if (!isSpawned) {
            spawnProgress.current = 0;
            coinRef.current.scale.setScalar(0.01);
            return;
        } else if (spawnProgress.current < 1) {
            spawnProgress.current = Math.min(spawnProgress.current + delta * 1.5, 1);
            coinRef.current.scale.setScalar(easeOutElastic(spawnProgress.current));
            return;
        }

        // Hover scale
        const targetScale = isHovered ? 1.12 : 1;
        hoverScale.current += (targetScale - hoverScale.current) * 0.08;
        coinRef.current.scale.setScalar(hoverScale.current);

        // Glow pulse
        const targetGlow = isHovered ? 0.6 + Math.sin(time * 4) * 0.2 : 0.15;
        glowIntensity.current += (targetGlow - glowIntensity.current) * 0.1;

        // Interactive tilt
        if (isHovered && !isFlipping) {
            tiltX.current += (mousePosition.current.y * 0.3 - tiltX.current) * 0.05;
            tiltZ.current += (-mousePosition.current.x * 0.3 - tiltZ.current) * 0.05;
        } else {
            tiltX.current += (0 - tiltX.current) * 0.1;
            tiltZ.current += (0 - tiltZ.current) * 0.1;
        }

        // Apply rotation
        if (!isFlipping) {
            if (isHovered) {
                // When hovering: continuous flip rotation front-to-back
                coinRef.current.rotation.x += 0.06; // Front-back flip
            } else {
                coinRef.current.rotation.x = baseTilt + currentFace.current + tiltX.current;
            }
            coinRef.current.rotation.z = tiltZ.current + Math.sin(time * 0.5) * 0.02;
        }

        // Auto rotation - FAST 360 spin when hovered!
        if (!isFlipping) {
            if (isHovered) {
                // Fast continuous 360 degree spin when hovering
                coinRef.current.rotation.y += 0.08; // Fast side spin
            } else {
                coinRef.current.rotation.y += 0.01 * rotationSpeed; // Normal slow rotation
            }
        }

        // Floating - MORE BOUNCY when hovered!
        if (isHovered && !isFlipping) {
            // Exaggerated bouncy jump up and down
            const bounceSpeed = 4; // Faster bounce
            const bounceHeight = 0.4; // Higher bounce
            coinRef.current.position.y = position[1] + Math.abs(Math.sin(time * bounceSpeed)) * bounceHeight;
        } else {
            // Normal gentle floating
            coinRef.current.position.y = position[1] + Math.sin(time * 0.8) * 0.15;
        }
        coinRef.current.position.x = position[0] + Math.sin(time * 0.6) * 0.02;

        // Flip animation with random result
        if (isFlipping) {
            flipProgress.current += delta * 2.5;
            const progress = Math.min(flipProgress.current, 1);
            const totalRotation = Math.PI * 6 + flipTarget.current;
            coinRef.current.rotation.x = baseTilt + easeInOutCubic(progress) * totalRotation;

            if (progress >= 0.8 && !showFlash) {
                setShowFlash(true);
                setShowConfetti(true);
                CoinSoundManager.playSuccess();
                setTimeout(() => setShowFlash(false), 200);
                setTimeout(() => setShowConfetti(false), 1500);
            }

            if (progress >= 1) {
                currentFace.current = flipTarget.current;
                coinRef.current.rotation.x = baseTilt + currentFace.current;
                setIsFlipping(false);
                flipProgress.current = 0;
            }
        }

        // Orbiting light
        if (lightRef.current) {
            lightRef.current.position.x = Math.cos(time * 2) * size * 2;
            lightRef.current.position.z = Math.sin(time * 2) * size * 2;
            lightRef.current.position.y = 1 + Math.sin(time * 1.5) * 0.5;
            lightRef.current.intensity = isFlipping ? 3 : (isHovered ? 2 : 1);
        }

        // Hover sound - continuous jingle loop
        if (isHovered && !wasHovered.current) {
            CoinSoundManager.startJingleLoop();
        } else if (!isHovered && wasHovered.current) {
            CoinSoundManager.stopJingleLoop();
        }
        wasHovered.current = isHovered;
    });

    const handleClick = useCallback(() => {
        focusOn(createFocusTarget(position, 4, 0.5), 0.8);
        if (!isFlipping) {
            flipTarget.current = Math.random() > 0.5 ? Math.PI : 0;
            setIsFlipping(true);
            flipProgress.current = 0;
            CoinSoundManager.playClink();
            CoinSoundManager.playWhoosh();
        }
    }, [position, focusOn, isFlipping]);

    return (
        <>
            <group ref={coinRef} position={position} rotation={[baseTilt, 0, 0]}>
                <pointLight ref={lightRef} color={coinColors.shine} intensity={1} distance={size * 4} decay={2} />
                <pointLight position={[0, size * 2, 0]} color={coinColors.glow} intensity={0.5} distance={size * 3} />
                <pointLight position={[size * 1.5, 0, size * 1.5]} color={theme === "gold" ? "#FF4500" : "#FF00FF"} intensity={isHovered ? 0.8 : 0.3} distance={size * 3} />

                {/* Main coin */}
                <mesh
                    onPointerOver={() => { setIsHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { setIsHovered(false); document.body.style.cursor = 'default'; }}
                    onClick={handleClick}
                    castShadow receiveShadow
                >
                    <cylinderGeometry args={[size, size, coinThickness, 64]} />
                    <meshPhysicalMaterial
                        color={coinColors.main} metalness={1} roughness={0.1}
                        clearcoat={1} clearcoatRoughness={0.05} reflectivity={1}
                        emissive={coinColors.main} emissiveIntensity={glowIntensity.current}
                        envMapIntensity={2} iridescence={0.3} sheen={0.5} sheenColor={coinColors.shine}
                    />
                </mesh>

                {/* Milled edge */}
                <MilledEdge size={size} thickness={coinThickness} color={coinColors.edge} ridgeCount={48} />

                {/* Beveled ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[size * 0.98, coinThickness * 0.3, 8, 64]} />
                    <meshPhysicalMaterial color={coinColors.edge} metalness={1} roughness={0.15} clearcoat={0.8} />
                </mesh>

                {/* Front face */}
                <group position={[0, coinThickness / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <Text fontSize={size * 0.35} color={coinColors.edge} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={coinColors.shine}>🐱🍌</Text>
                    <Text position={[0, -size * 0.5, 0]} fontSize={size * 0.14} color={coinColors.edge} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor={coinColors.shine}>BANMAO</Text>
                </group>

                {/* Back face */}
                <group position={[0, -coinThickness / 2 - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <Text fontSize={size * 0.4} color={coinColors.edge} anchorX="center" anchorY="middle">💲💲💲</Text>
                </group>

                {showFlash && <FlashEffect size={size} />}
                <GlowEffect size={size} thickness={coinThickness} color={primaryColor} intensity={glowIntensity.current} isHovered={isHovered} isFlipping={isFlipping} />
                <EnhancedSparkles color={coinColors.particle} count={isHovered ? 20 : 10} size={size} isFlipping={isFlipping} />
                {(isFlipping || isHovered) && <ParticleTrail color={coinColors.glow} size={size} intensity={isFlipping ? 1.5 : 0.4} />}
                {showConfetti && <ConfettiBurst colors={coinColors.confetti} />}
            </group>
        </>
    );
}

function FlashEffect({ size }: { size: number }) {
    const flashRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (flashRef.current) {
            flashRef.current.scale.multiplyScalar(1.3);
            (flashRef.current.material as THREE.MeshBasicMaterial).opacity *= 0.85;
        }
    });
    return (
        <mesh ref={flashRef} scale={1}>
            <sphereGeometry args={[size * 0.8, 32, 32]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
    );
}

function ConfettiBurst({ colors }: { colors: string[] }) {
    const particlesRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => Array.from({ length: 40 }).map(() => ({
        velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 2, (Math.random() - 0.5) * 4),
        rotSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        scale: 0.05 + Math.random() * 0.05
    })), [colors]);

    useFrame((_, delta) => {
        if (particlesRef.current) {
            particlesRef.current.children.forEach((child, i) => {
                const mesh = child as THREE.Mesh;
                const p = particles[i];
                mesh.position.x += p.velocity.x * delta;
                mesh.position.y += p.velocity.y * delta;
                mesh.position.z += p.velocity.z * delta;
                p.velocity.y -= 8 * delta;
                mesh.rotation.z += p.rotSpeed * delta;
                (mesh.material as THREE.MeshBasicMaterial).opacity *= 0.98;
            });
        }
    });

    return (
        <group ref={particlesRef}>
            {particles.map((p, i) => (
                <mesh key={i} scale={p.scale}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color={p.color} transparent opacity={1} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

function MilledEdge({ size, thickness, color, ridgeCount }: { size: number; thickness: number; color: string; ridgeCount: number }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    // Need to set matrices after mount and when geometry budget changes.
    useEffect(() => {
        if (!meshRef.current) return;
        const dummy = new THREE.Object3D();
        for (let i = 0; i < ridgeCount; i++) {
            const angle = (i / ridgeCount) * Math.PI * 2;
            dummy.position.set(Math.cos(angle) * size * 0.99, 0, Math.sin(angle) * size * 0.99);
            dummy.rotation.set(0, -angle + Math.PI / 2, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [size, ridgeCount]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, ridgeCount]}>
            <boxGeometry args={[0.02, thickness * 0.9, 0.04]} />
            <meshPhysicalMaterial color={color} metalness={1} roughness={0.25} clearcoat={0.5} />
        </instancedMesh>
    );
}

function GlowEffect({ size, thickness, color, intensity, isHovered, isFlipping }: { size: number; thickness: number; color: string; intensity: number; isHovered: boolean; isFlipping: boolean }) {
    const pulseIntensity = isFlipping ? intensity * 2 : intensity;
    return (
        <group>
            <mesh scale={isHovered ? 1.1 : 1.04}>
                <cylinderGeometry args={[size, size, thickness * 0.5, 32]} />
                <meshBasicMaterial color={color} transparent opacity={pulseIntensity * 0.9} side={THREE.BackSide} />
            </mesh>
            <mesh scale={isHovered ? 1.25 : 1.12}>
                <cylinderGeometry args={[size, size, thickness * 0.3, 32]} />
                <meshBasicMaterial color={color} transparent opacity={pulseIntensity * 0.5} side={THREE.BackSide} />
            </mesh>
            {isFlipping && (
                <mesh scale={1.4}>
                    <cylinderGeometry args={[size, size, thickness * 0.2, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.BackSide} />
                </mesh>
            )}
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={isHovered ? 1.35 : 1.18}>
                <ringGeometry args={[size * 0.95, size * 1.15, 64]} />
                <meshBasicMaterial color={color} transparent opacity={pulseIntensity * 0.6} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function EnhancedSparkles({ color, count, size, isFlipping }: { color: string; count: number; size: number; isFlipping: boolean }) {
    const sparklesRef = useRef<THREE.Group>(null);
    const sparkleRefs = useRef<THREE.Mesh[]>([]);

    const localTime = useRef(0);

    useFrame((state, delta) => {
        localTime.current += Math.min(delta, 0.1);
        if (sparklesRef.current) sparklesRef.current.rotation.z = localTime.current * 0.5;
        sparkleRefs.current.forEach((sparkle, i) => {
            if (sparkle) {
                const t = localTime.current + i * 0.5;
                sparkle.scale.setScalar(0.4 + Math.sin(t * 3) * 0.6);
                if (isFlipping) {
                    const expandRadius = size * 1.3 + Math.sin(t * 5) * 0.5;
                    const angle = (i / count) * Math.PI * 2;
                    sparkle.position.x = Math.cos(angle + t * 0.8) * expandRadius;
                    sparkle.position.z = Math.sin(angle + t * 0.8) * expandRadius;
                    sparkle.position.y = Math.sin(t * 4 + i) * 0.4;
                }
            }
        });
    });

    return (
        <group ref={sparklesRef}>
            {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * Math.PI * 2;
                const radius = size * 1.3;
                return (
                    <mesh key={i} ref={(el) => { if (el) sparkleRefs.current[i] = el; }} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
                        <sphereGeometry args={[0.07, 16, 16]} />
                        <meshBasicMaterial color={color} transparent opacity={0.95} />
                    </mesh>
                );
            })}
        </group>
    );
}

function ParticleTrail({ color, size, intensity }: { color: string; size: number; intensity: number }) {
    const particlesRef = useRef<THREE.Group>(null);
    const particleCount = 32;

    const localTime = useRef(0);

    useFrame((state, delta) => {
        localTime.current += Math.min(delta, 0.1);
        if (particlesRef.current) {
            const time = localTime.current;
            particlesRef.current.children.forEach((child, i) => {
                const mesh = child as THREE.Mesh;
                const t = time * 2.5 + i * 0.12;
                const radius = size * 1.15 + Math.sin(t * 0.8) * 0.25;
                const angle = t * 2.5 + (i / particleCount) * Math.PI * 2;
                mesh.position.set(Math.cos(angle) * radius, Math.sin(t * 3 + i * 0.12) * 0.35, Math.sin(angle) * radius);
                mesh.scale.setScalar((0.35 + Math.sin(t * 4) * 0.25) * intensity);
            });
        }
    });

    return (
        <group ref={particlesRef}>
            {Array.from({ length: particleCount }).map((_, i) => (
                <mesh key={i}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.7 * intensity} />
                </mesh>
            ))}
        </group>
    );
}
