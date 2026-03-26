"use client";

import { useEffect, useRef } from "react";

interface Rocket {
    x: number;
    y: number;
    speed: number;
    size: number;
    color: string;
    glowColor: string;
    accentColor: string;
    trail: { x: number; y: number; opacity: number; size: number; rotation: number }[];
    rotation: number;
    targetRotation: number;
    landed: boolean;
    landedX: number;
    landedY: number;
    landingProgress: number;
    landedRotation: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'star';
}

interface Crater {
    x: number;
    y: number;
    size: number;
    depth: number;
}

const ROCKET_COLORS = [
    { main: "#e8e8e8", glow: "#ffffff", accent: "#a855f7" },
    { main: "#c0c0c0", glow: "#f0f0f0", accent: "#facc15" },
    { main: "#d4d4d4", glow: "#ffffff", accent: "#22d3ee" },
    { main: "#e0e0e0", glow: "#ffffff", accent: "#f97316" },
    { main: "#d8d8d8", glow: "#f8f8f8", accent: "#10b981" },
];

const ORBIT_TEXT = "✦✦✦ TO THE MOON ✦✦✦ TO THE MOON ";

export default function F1RacingBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rocketsRef = useRef<Rocket[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const cratersRef = useRef<Crater[]>([]);
    const animationRef = useRef<number>(0);
    const moonRef = useRef({ x: 0, y: 0, radius: 0 });
    const orbitAngleRef = useRef(0);
    const moonPulseRef = useRef(0);
    const moonBreathRef = useRef(1);
    const moonHoverRef = useRef(false);
    const moonClickRef = useRef(false);
    const orbitSpeedRef = useRef(0.006);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const moonRadius = Math.min(canvas.width, canvas.height) * 0.11;
            moonRef.current = {
                x: canvas.width - moonRadius - 100,
                y: moonRadius + 90,
                radius: moonRadius,
            };

            generateCraters();
        };

        const generateCraters = () => {
            cratersRef.current = [];
            const moon = moonRef.current;
            const numCraters = 10 + Math.floor(Math.random() * 6);

            for (let i = 0; i < numCraters; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * moon.radius * 0.8;
                cratersRef.current.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    size: 3 + Math.random() * (moon.radius * 0.1),
                    depth: 0.1 + Math.random() * 0.2,
                });
            }
        };

        resize();
        window.addEventListener("resize", resize);

        // Mouse interaction handlers (document-level to work with pointerEvents:none)
        const handleMouseMove = (e: MouseEvent) => {
            const moon = moonRef.current;
            const dist = Math.sqrt((e.clientX - moon.x) ** 2 + (e.clientY - moon.y) ** 2);
            moonHoverRef.current = dist < moon.radius * 2;
        };

        const handleMouseDown = (e: MouseEvent) => {
            const moon = moonRef.current;
            const dist = Math.sqrt((e.clientX - moon.x) ** 2 + (e.clientY - moon.y) ** 2);
            if (dist < moon.radius * 2) {
                moonClickRef.current = true;
                moonBreathRef.current = 1.15;
            }
        };

        const handleMouseUp = () => {
            moonClickRef.current = false;
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mouseup", handleMouseUp);

        // Initialize rockets - SPREAD ACROSS ENTIRE PAGE WIDTH
        const initRockets = () => {
            rocketsRef.current = [];
            const numRockets = 12;
            for (let i = 0; i < numRockets; i++) {
                const colorSet = ROCKET_COLORS[i % ROCKET_COLORS.length];
                // Spread rockets across full page width
                const startX = (canvas.width * 0.05) + (i / numRockets) * (canvas.width * 0.8) + Math.random() * (canvas.width * 0.1);
                const startY = canvas.height + 100 + Math.random() * 800;

                rocketsRef.current.push({
                    x: startX,
                    y: startY,
                    speed: 1.2 + Math.random() * 1.2,
                    size: 40 + Math.random() * 15,
                    color: colorSet.main,
                    glowColor: colorSet.glow,
                    accentColor: colorSet.accent,
                    trail: [],
                    rotation: 0,
                    targetRotation: 0,
                    landed: false,
                    landedX: 0,
                    landedY: 0,
                    landingProgress: 0,
                    landedRotation: 0,
                });
            }
        };
        initRockets();

        // Draw curved orbiting text around moon
        const drawOrbitingText = () => {
            const moon = moonRef.current;
            const orbitRadius = moon.radius * 1.6;
            const text = ORBIT_TEXT;
            const fontSize = moon.radius * 0.16;

            ctx.save();
            ctx.translate(moon.x, moon.y);

            ctx.font = `bold ${fontSize}px 'Orbitron', 'Space Mono', monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Calculate angle per character
            const totalChars = text.length;
            const anglePerChar = (Math.PI * 2) / totalChars;

            for (let i = 0; i < totalChars; i++) {
                const char = text[i];
                const charAngle = orbitAngleRef.current + (i * anglePerChar);

                const x = Math.cos(charAngle) * orbitRadius;
                const y = Math.sin(charAngle) * orbitRadius;

                ctx.save();
                ctx.translate(x, y);
                // Rotate each character to face outward from circle
                ctx.rotate(charAngle + Math.PI / 2);

                // Glow effect - stronger on hover/click
                const isActive = moonHoverRef.current || moonClickRef.current;
                ctx.shadowColor = isActive ? "#fff700" : "#ffd700";
                ctx.shadowBlur = (isActive ? 18 : 8) + Math.sin(moonPulseRef.current * 2 + i * 0.3) * (isActive ? 8 : 4);

                // 3D effect shadow
                ctx.fillStyle = "rgba(139, 69, 19, 0.5)";
                ctx.fillText(char, 1.5, 1.5);

                // Main text with gradient-like effect based on position
                const brightness = 0.7 + Math.sin(charAngle) * 0.3;
                ctx.fillStyle = `rgba(255, ${Math.floor(215 * brightness)}, ${Math.floor(50 * brightness)}, 1)`;
                ctx.fillText(char, 0, 0);

                // White highlight
                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(charAngle + Math.PI) * 0.2})`;
                ctx.fillText(char, -0.5, -0.5);

                ctx.restore();
            }

            ctx.restore();
        };

        // Draw moon with pulsing glow
        const drawMoon = () => {
            const moon = moonRef.current;
            const breathScale = moonBreathRef.current;
            const isActive = moonHoverRef.current || moonClickRef.current;
            const pulseIntensity = isActive
                ? 0.8 + Math.sin(moonPulseRef.current * 3) * 0.4  // Faster, stronger pulse on hover
                : 0.5 + Math.sin(moonPulseRef.current) * 0.25;

            ctx.save();
            ctx.translate(moon.x, moon.y);
            ctx.scale(breathScale, breathScale);

            // Pulsing outer glow - much larger and brighter on hover
            const glowMultiplier = isActive ? 2.2 : 1.5;
            const glowSize = moon.radius * (glowMultiplier + Math.sin(moonPulseRef.current * 2) * (isActive ? 0.2 : 0.08));
            const glowGradient = ctx.createRadialGradient(0, 0, moon.radius * 0.6, 0, 0, glowSize);
            const glowAlpha = isActive ? 0.6 : 0.3;
            glowGradient.addColorStop(0, `rgba(255, 240, 100, ${glowAlpha * pulseIntensity})`);
            glowGradient.addColorStop(0.3, `rgba(255, 220, 80, ${glowAlpha * 0.6 * pulseIntensity})`);
            glowGradient.addColorStop(0.6, `rgba(255, 200, 50, ${glowAlpha * 0.3 * pulseIntensity})`);
            glowGradient.addColorStop(1, "rgba(255, 200, 50, 0)");
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Moon base
            const moonGradient = ctx.createRadialGradient(
                -moon.radius * 0.25, -moon.radius * 0.25, 0,
                0, 0, moon.radius
            );
            moonGradient.addColorStop(0, "#fffacd");
            moonGradient.addColorStop(0.25, "#ffd700");
            moonGradient.addColorStop(0.55, "#daa520");
            moonGradient.addColorStop(1, "#b8860b");

            ctx.fillStyle = moonGradient;
            ctx.beginPath();
            ctx.arc(0, 0, moon.radius, 0, Math.PI * 2);
            ctx.fill();

            // Craters
            cratersRef.current.forEach((crater) => {
                ctx.fillStyle = `rgba(139, 90, 43, ${crater.depth})`;
                ctx.beginPath();
                ctx.ellipse(crater.x, crater.y, crater.size, crater.size * 0.75, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(100, 60, 20, ${crater.depth * 0.6})`;
                ctx.beginPath();
                ctx.ellipse(crater.x + crater.size * 0.1, crater.y + crater.size * 0.1,
                    crater.size * 0.6, crater.size * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            // Highlight
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.beginPath();
            ctx.ellipse(-moon.radius * 0.25, -moon.radius * 0.25,
                moon.radius * 0.4, moon.radius * 0.3, -0.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Draw orbiting text
            drawOrbitingText();
        };

        // Draw energy flame
        const drawEnergyFlame = (rocket: Rocket) => {
            if (rocket.landed) return;

            const h = rocket.size;
            const w = rocket.size * 0.28;

            ctx.save();
            ctx.translate(rocket.x, rocket.y);
            ctx.rotate(rocket.rotation);

            const flameStartY = h / 2 + 6;
            const flameLength = h * 0.6 + Math.random() * h * 0.1;

            ctx.shadowColor = "#00bfff";
            ctx.shadowBlur = 15;

            const flameGradient = ctx.createLinearGradient(0, flameStartY, 0, flameStartY + flameLength);
            flameGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
            flameGradient.addColorStop(0.12, "rgba(0, 255, 255, 0.8)");
            flameGradient.addColorStop(0.35, "rgba(30, 144, 255, 0.6)");
            flameGradient.addColorStop(0.65, "rgba(99, 102, 241, 0.3)");
            flameGradient.addColorStop(1, "rgba(139, 92, 246, 0)");

            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.moveTo(-w * 0.18, flameStartY);
            ctx.lineTo(w * 0.18, flameStartY);
            ctx.lineTo(w * 0.05, flameStartY + flameLength * 0.7);
            ctx.lineTo(0, flameStartY + flameLength);
            ctx.lineTo(-w * 0.05, flameStartY + flameLength * 0.7);
            ctx.closePath();
            ctx.fill();

            // Core
            const coreLength = flameLength * 0.4;
            const coreGradient = ctx.createLinearGradient(0, flameStartY, 0, flameStartY + coreLength);
            coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
            coreGradient.addColorStop(0.5, "rgba(224, 255, 255, 0.7)");
            coreGradient.addColorStop(1, "rgba(0, 255, 255, 0)");

            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.moveTo(-w * 0.07, flameStartY);
            ctx.lineTo(w * 0.07, flameStartY);
            ctx.lineTo(0, flameStartY + coreLength);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        // Draw rocket
        const drawRocket = (rocket: Rocket, scale: number = 1) => {
            ctx.save();
            ctx.translate(rocket.x, rocket.y);
            ctx.rotate(rocket.rotation);
            ctx.scale(scale, scale);

            const w = rocket.size * 0.3;
            const h = rocket.size;

            ctx.shadowColor = rocket.accentColor;
            ctx.shadowBlur = 12;

            const bodyGradient = ctx.createLinearGradient(-w, 0, w, 0);
            bodyGradient.addColorStop(0, "#777");
            bodyGradient.addColorStop(0.3, rocket.color);
            bodyGradient.addColorStop(0.5, "#fff");
            bodyGradient.addColorStop(0.7, rocket.color);
            bodyGradient.addColorStop(1, "#777");

            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.quadraticCurveTo(w * 0.25, -h / 3, w / 2, -h / 5);
            ctx.lineTo(w / 2, h / 3);
            ctx.lineTo(w * 0.8, h / 2 + 6);
            ctx.lineTo(w / 2, h / 2 - 3);
            ctx.lineTo(w / 3, h / 2);
            ctx.lineTo(-w / 3, h / 2);
            ctx.lineTo(-w / 2, h / 2 - 3);
            ctx.lineTo(-w * 0.8, h / 2 + 6);
            ctx.lineTo(-w / 2, h / 3);
            ctx.lineTo(-w / 2, -h / 5);
            ctx.quadraticCurveTo(-w * 0.25, -h / 3, 0, -h / 2);
            ctx.closePath();
            ctx.fill();

            // Nose tip
            ctx.shadowBlur = 0;
            ctx.fillStyle = rocket.accentColor;
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);
            ctx.quadraticCurveTo(w * 0.1, -h / 2.4, w * 0.12, -h / 3);
            ctx.lineTo(-w * 0.12, -h / 3);
            ctx.quadraticCurveTo(-w * 0.1, -h / 2.4, 0, -h / 2);
            ctx.closePath();
            ctx.fill();

            // Stripes
            ctx.fillStyle = rocket.accentColor;
            ctx.fillRect(-w / 2 - 1, -h / 8, 2.5, h / 3);
            ctx.fillRect(w / 2 - 1.5, -h / 8, 2.5, h / 3);

            // Window
            const windowGradient = ctx.createRadialGradient(0, -h / 5, 0, 0, -h / 5, w / 3);
            windowGradient.addColorStop(0, "#4a9eff");
            windowGradient.addColorStop(0.6, "#1a1a3a");
            windowGradient.addColorStop(1, "#0a0a1a");
            ctx.fillStyle = windowGradient;
            ctx.beginPath();
            ctx.ellipse(0, -h / 5, w / 4, w / 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // $banmao text
            ctx.fillStyle = rocket.accentColor;
            ctx.font = `bold ${rocket.size * 0.08}px 'Space Mono', monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = rocket.accentColor;
            ctx.shadowBlur = 3;
            ctx.fillText("$banmao", 0, h / 10);

            // Logo
            ctx.font = `${rocket.size * 0.09}px Arial`;
            ctx.fillText("🐱", 0, h / 4.5);

            // Fins
            const finGradient = ctx.createLinearGradient(0, h / 3, 0, h / 2 + 6);
            finGradient.addColorStop(0, rocket.accentColor);
            finGradient.addColorStop(1, "#333");
            ctx.fillStyle = finGradient;
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.moveTo(w * 0.8, h / 2 + 6);
            ctx.lineTo(w / 2, h / 3);
            ctx.lineTo(w / 2, h / 2 - 3);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-w * 0.8, h / 2 + 6);
            ctx.lineTo(-w / 2, h / 3);
            ctx.lineTo(-w / 2, h / 2 - 3);
            ctx.closePath();
            ctx.fill();

            // Nozzle
            ctx.fillStyle = "#333";
            ctx.beginPath();
            ctx.moveTo(-w / 4, h / 2);
            ctx.lineTo(-w / 5, h / 2 + 8);
            ctx.lineTo(w / 5, h / 2 + 8);
            ctx.lineTo(w / 4, h / 2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        };

        // Landing dust
        const addLandingDust = (rocket: Rocket) => {
            moonBreathRef.current = 1.06;

            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.6 + Math.random() * 1;
                particlesRef.current.push({
                    x: rocket.landedX,
                    y: rocket.landedY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed * 0.3,
                    life: 1,
                    maxLife: 1,
                    size: 2 + Math.random() * 3,
                    color: "#daa520",
                    type: 'star',
                });
            }
        };

        // Add stars
        const addStars = () => {
            if (Math.random() > 0.97) {
                particlesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height * 0.6,
                    vx: 0,
                    vy: 0,
                    life: 0.5 + Math.random() * 0.5,
                    maxLife: 1,
                    size: 1 + Math.random() * 1.5,
                    color: "#fff",
                    type: 'star',
                });
            }
        };

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dynamic orbit speed - faster on hover/click
            const isActive = moonHoverRef.current || moonClickRef.current;
            const targetSpeed = isActive ? 0.025 : 0.006;
            orbitSpeedRef.current += (targetSpeed - orbitSpeedRef.current) * 0.05;
            orbitAngleRef.current += orbitSpeedRef.current;

            // Moon pulse - faster on hover
            moonPulseRef.current += isActive ? 0.12 : 0.04;

            // Continuous pulse on click
            if (moonClickRef.current) {
                moonBreathRef.current = 1 + Math.sin(moonPulseRef.current * 4) * 0.08;
            } else {
                // Moon breath recovery
                moonBreathRef.current += (1 - moonBreathRef.current) * 0.02;
            }

            addStars();

            // Stars
            particlesRef.current.forEach((p) => {
                ctx.save();
                if (p.color === "#fff") {
                    ctx.globalAlpha = p.life * (0.5 + Math.sin(Date.now() * 0.01 + p.x) * 0.5);
                } else {
                    ctx.globalAlpha = p.life * 0.5;
                }
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            drawMoon();

            const moon = moonRef.current;

            rocketsRef.current.forEach((rocket) => {
                if (!rocket.landed) {
                    // Flame first
                    ctx.globalAlpha = 0.8;
                    drawEnergyFlame(rocket);
                    ctx.globalAlpha = 1;

                    // Trail
                    rocket.trail.push({
                        x: rocket.x,
                        y: rocket.y,
                        opacity: 0.2,
                        size: rocket.size * 0.05,
                        rotation: rocket.rotation,
                    });
                    if (rocket.trail.length > 15) rocket.trail.shift();

                    rocket.trail.forEach((point, i) => {
                        const alpha = (i / rocket.trail.length) * point.opacity * 0.06;
                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.fillStyle = rocket.accentColor;
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, point.size * (i / rocket.trail.length) * 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    });

                    ctx.globalAlpha = 0.65;
                    drawRocket(rocket);
                    ctx.globalAlpha = 1;

                    // Movement
                    const dx = moon.x - rocket.x;
                    const dy = moon.y - rocket.y;
                    const angleToMoon = Math.atan2(dx, -dy);

                    rocket.targetRotation = angleToMoon * 0.9;
                    rocket.rotation += (rocket.targetRotation - rocket.rotation) * 0.02;

                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const moveX = (dx / distance) * rocket.speed;
                    const moveY = (dy / distance) * rocket.speed;

                    rocket.x += moveX;
                    rocket.y += moveY;

                    // Landing
                    if (distance < moon.radius * 0.75) {
                        rocket.landed = true;
                        const surfaceAngle = Math.atan2(rocket.y - moon.y, rocket.x - moon.x);
                        rocket.landedX = moon.x + Math.cos(surfaceAngle) * (moon.radius * 0.7);
                        rocket.landedY = moon.y + Math.sin(surfaceAngle) * (moon.radius * 0.7);
                        rocket.landedRotation = surfaceAngle + Math.PI / 2;
                        rocket.landingProgress = 0;
                        addLandingDust(rocket);
                    }
                } else {
                    // Landed
                    rocket.landingProgress = Math.min(1, rocket.landingProgress + 0.03);

                    const landedScale = 0.12 + (1 - rocket.landingProgress) * 0.06;
                    const settleY = rocket.landedY - (1 - rocket.landingProgress) * 8;

                    ctx.save();
                    ctx.globalAlpha = 0.7;
                    ctx.translate(rocket.landedX, settleY);
                    ctx.rotate(rocket.landedRotation);
                    ctx.scale(landedScale, landedScale);
                    ctx.translate(-rocket.landedX, -settleY);

                    drawRocket({ ...rocket, x: rocket.landedX, y: settleY, rotation: 0 }, 1);
                    ctx.restore();

                    if (rocket.landingProgress >= 1 && rocket.landingProgress < 1.01) {
                        rocket.landingProgress = 1.01;
                        setTimeout(() => {
                            rocket.landed = false;
                            // Reset to spread position across page
                            const idx = rocketsRef.current.indexOf(rocket);
                            rocket.x = (canvas.width * 0.05) + (idx / rocketsRef.current.length) * (canvas.width * 0.8) + Math.random() * (canvas.width * 0.1);
                            rocket.y = canvas.height + 100 + Math.random() * 400;
                            rocket.rotation = 0;
                            rocket.trail = [];
                        }, 2000 + Math.random() * 3000);
                    }
                }
            });

            // Update particles
            particlesRef.current = particlesRef.current.filter((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.012;
                if (p.color !== "#fff") {
                    p.size *= 1.01;
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                }
                return p.life > 0;
            });

            if (particlesRef.current.length > 120) {
                particlesRef.current = particlesRef.current.slice(-120);
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resize);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mouseup", handleMouseUp);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 0,
                opacity: 0.75,
            }}
        />
    );
}
