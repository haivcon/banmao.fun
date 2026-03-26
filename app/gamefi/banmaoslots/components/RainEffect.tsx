// RainEffect.tsx - Realistic rain with physics, collision, and ambient music notes
'use client';

import React, { useEffect, useRef } from 'react';

// Types
interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Drop {
    x: number;
    y: number;
    speed: number;
    length: number;
    opacity: number;
    width: number;
    layer: number;
    groundY: number;
    state: 'falling' | 'rolling' | 'puddle';
    elementId?: number;
    noteIndex?: number; // Pre-assigned note for this drop
}

interface SplashParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
}

// ==================== AUDIO SYSTEM ====================
class RainAudio {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized = false;
    private lastPlayTime = 0;
    private noteInterval = 400; // Min ms between notes (slower = more relaxing)

    // Pentatonic scale frequencies (C major pentatonic, multiple octaves)
    // C4, D4, E4, G4, A4, C5, D5, E5, G5, A5
    private notes = [
        261.63, 293.66, 329.63, 392.00, 440.00, // C4 to A4
        523.25, 587.33, 659.25, 783.99, 880.00, // C5 to A5
        1046.50, 1174.66, 1318.51 // C6 to E6 (high sparkle)
    ];

    init() {
        if (this.isInitialized) return;
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.08; // Very subtle
            this.masterGain.connect(this.audioContext.destination);
            this.isInitialized = true;
        } catch (e) {
            console.warn('Rain audio init failed:', e);
        }
    }

    playNote(noteIndex: number, volume: number = 0.5) {
        if (!this.isInitialized || !this.audioContext || !this.masterGain) return;

        const now = performance.now();
        if (now - this.lastPlayTime < this.noteInterval) return; // Rate limit
        this.lastPlayTime = now;

        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // Create oscillator - sine for soft, clean sound
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = this.notes[noteIndex % this.notes.length];

        // Envelope for gentle attack and decay
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, time + 0.02); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8); // Gentle decay

        // Light reverb via delay
        const delay = ctx.createDelay();
        delay.delayTime.value = 0.15;
        const delayGain = ctx.createGain();
        delayGain.gain.value = 0.2;

        // Connect
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        gainNode.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 1);
    }

    setVolume(v: number) {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
}

const rainAudio = new RainAudio();

// ==================== COMPONENT ====================
const RainEffect = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const obstaclesRef = useRef<Box[]>([]);
    const audioInitRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize audio on first user interaction
        const initAudio = () => {
            if (!audioInitRef.current) {
                rainAudio.init();
                audioInitRef.current = true;
            }
        };
        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });
        window.addEventListener('touchstart', initAudio, { once: true });

        let animationFrameId: number;
        let drops: Drop[] = [];
        let splashParticles: SplashParticle[] = [];
        let frameCount = 0;

        const updateObstacles = () => {
            const elements = document.querySelectorAll('[data-rain-target="true"]');
            const newObstacles: Box[] = [];
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    newObstacles.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                }
            });
            obstaclesRef.current = newObstacles;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', updateObstacles);
        window.addEventListener('resize', updateObstacles);
        updateObstacles();

        const init = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drops = [];
            splashParticles = [];
            for (let i = 0; i < 120; i++) {
                drops.push(createDrop(true));
            }
        };

        const createDrop = (randomY = false): Drop => {
            const layer = Math.random() < 0.3 ? 0 : (Math.random() < 0.6 ? 1 : 2);
            const configs = [
                { speed: [4, 7], length: [8, 15], opacity: [0.05, 0.1], width: 0.5, groundRange: [0.45, 0.60] },
                { speed: [8, 13], length: [15, 28], opacity: [0.1, 0.18], width: 1, groundRange: [0.60, 0.78] },
                { speed: [14, 22], length: [25, 45], opacity: [0.15, 0.3], width: 1.5, groundRange: [0.78, 0.95] }
            ][layer];

            const groundY = canvas.height * (configs.groundRange[0] + Math.random() * (configs.groundRange[1] - configs.groundRange[0]));

            // Assign a random note from the scale
            const noteIndex = Math.floor(Math.random() * 13);

            return {
                x: Math.random() * canvas.width,
                y: randomY ? Math.random() * canvas.height : -200 - Math.random() * 300, // Start higher for more depth
                speed: configs.speed[0] + Math.random() * (configs.speed[1] - configs.speed[0]),
                length: configs.length[0] + Math.random() * (configs.length[1] - configs.length[0]),
                opacity: configs.opacity[0] + Math.random() * (configs.opacity[1] - configs.opacity[0]),
                width: configs.width,
                layer,
                groundY,
                state: 'falling',
                noteIndex
            };
        };

        const createSplash = (x: number, y: number, size: number, noteIndex?: number) => {
            const count = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                splashParticles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -2 - Math.random() * 3,
                    life: 20 + Math.random() * 10,
                    size: size * (0.8 + Math.random() * 0.4)
                });
            }
            // Play note on splash (only for mid/near layers)
            if (noteIndex !== undefined && size > 0.5) {
                rainAudio.playNote(noteIndex, 0.3 + size * 0.2);
            }
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frameCount++;
            if (frameCount % 5 === 0) updateObstacles();

            const mouse = mouseRef.current;
            const repelRadius = 120;

            drops.forEach((drop, i) => {
                if (drop.state === 'falling') {
                    const dx = drop.x - mouse.x;
                    const dy = drop.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < repelRadius && dist > 0) {
                        const force = (1 - dist / repelRadius) * 60;
                        drop.x += (dx / dist) * force * 0.1;
                    }

                    drop.y += drop.speed;
                    drop.x -= 0.2;

                    if (drop.layer > 0) {
                        const obstacles = obstaclesRef.current;
                        for (let k = 0; k < obstacles.length; k++) {
                            const obs = obstacles[k];
                            const tipY = drop.y + drop.length;
                            if (drop.x >= obs.x && drop.x <= obs.x + obs.w &&
                                tipY >= obs.y && tipY <= obs.y + 20) {
                                drop.state = 'rolling';
                                drop.y = obs.y;
                                drop.speed = 0.5 + Math.random() * 1.5;
                                drop.elementId = k;
                                createSplash(drop.x, drop.y, drop.width, drop.noteIndex);
                                break;
                            }
                        }
                    }

                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(180, 200, 240, ${drop.opacity})`;
                    ctx.lineWidth = drop.width;
                    ctx.moveTo(drop.x, drop.y);
                    ctx.lineTo(drop.x - 1, drop.y + drop.length);
                    ctx.stroke();

                    if (drop.y > drop.groundY) {
                        if (drop.layer > 0 && Math.random() < 0.4) createSplash(drop.x, drop.groundY, drop.width, drop.noteIndex);
                        drops[i] = createDrop();
                    } else if (drop.y > canvas.height) {
                        drops[i] = createDrop();
                    }

                } else if (drop.state === 'rolling') {
                    if (drop.elementId === undefined || !obstaclesRef.current[drop.elementId]) {
                        drop.state = 'falling';
                        drop.speed = 10;
                    } else {
                        const obs = obstaclesRef.current[drop.elementId];
                        drop.y += drop.speed;
                        if (drop.y > obs.y + obs.h) {
                            drop.state = 'falling';
                            drop.speed = 10 + Math.random() * 5;
                        } else if (drop.x < obs.x || drop.x > obs.x + obs.w) {
                            drop.state = 'falling';
                            drop.speed = 10;
                        }
                    }

                    ctx.beginPath();
                    ctx.fillStyle = `rgba(200, 220, 255, ${Math.min(0.8, drop.opacity * 3)})`;
                    ctx.arc(drop.x, drop.y, 1.5 + drop.width * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            splashParticles = splashParticles.filter(p => {
                p.vy += 0.2;
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                if (p.life <= 0) return false;
                ctx.beginPath();
                ctx.fillStyle = `rgba(180, 210, 255, ${(p.life / 30) * 0.6})`;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });

            animationFrameId = requestAnimationFrame(render);
        };

        init();
        window.addEventListener('resize', init);
        render();

        return () => {
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', updateObstacles);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999
            }}
        />
    );
};

export default RainEffect;
