"use client";

import React, { useEffect, useRef } from "react";

/**
 * FloatingEmojis — Ambient cat 🐱 and banana 🍌 emojis that drift
 * randomly across the entire page for a playful vibe.
 * Appends particles directly to document.body for guaranteed visibility.
 */

const EMOJIS = ["🐱", "🍌", "😺", "🍌", "😸", "🍌", "🐈", "🍌"];
const MAX_PARTICLES = 14;
const SPAWN_INTERVAL = 2200; // ms between spawns

export default function FloatingEmojis() {
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        // Inject keyframes once
        if (!document.getElementById("floating-emoji-styles")) {
            const style = document.createElement("style");
            style.id = "floating-emoji-styles";
            style.textContent = `
                @keyframes floatEmojiUp {
                    0% {
                        opacity: 0;
                        transform: translateY(0) rotate(0deg) scale(0.3);
                    }
                    8% {
                        opacity: 0.6;
                        transform: translateY(-8vh) rotate(20deg) scale(1);
                    }
                    50% {
                        opacity: 0.4;
                    }
                    85% {
                        opacity: 0.12;
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-105vh) rotate(360deg) scale(0.2);
                    }
                }
                @keyframes driftEmojiX {
                    0%, 100% { margin-left: 0px; }
                    33% { margin-left: 20px; }
                    66% { margin-left: -20px; }
                }
                .floating-emoji-particle {
                    position: fixed !important;
                    bottom: -40px;
                    pointer-events: none !important;
                    user-select: none;
                    z-index: 9;
                    line-height: 1;
                }
            `;
            document.head.appendChild(style);
        }

        const particles: HTMLElement[] = [];

        const spawnParticle = () => {
            if (!mountedRef.current) return;
            if (particles.length >= MAX_PARTICLES) return;

            const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
            const el = document.createElement("span");
            el.className = "floating-emoji-particle";

            // Randomize
            const left = 3 + Math.random() * 94;
            const duration = 10 + Math.random() * 14;
            const size = 16 + Math.random() * 18;
            const delay = Math.random() * 0.8;
            const driftDur = 3 + Math.random() * 5;

            el.textContent = emoji;
            el.style.left = `${left}%`;
            el.style.fontSize = `${size}px`;
            el.style.opacity = "0";
            el.style.animation = `floatEmojiUp ${duration}s ease-out ${delay}s forwards, driftEmojiX ${driftDur}s ease-in-out ${delay}s infinite`;

            document.body.appendChild(el);
            particles.push(el);

            // Auto-remove after animation
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
                const idx = particles.indexOf(el);
                if (idx !== -1) particles.splice(idx, 1);
            }, (duration + delay) * 1000 + 200);
        };

        // Initial burst
        for (let i = 0; i < 5; i++) {
            setTimeout(spawnParticle, i * 500);
        }

        // Continuous spawning
        const interval = setInterval(spawnParticle, SPAWN_INTERVAL);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
            // Cleanup all particles
            particles.forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            particles.length = 0;
        };
    }, []);

    // No visible DOM needed — particles go directly to document.body
    return null;
}
