'use client';
// Confetti utility for big win celebrations
import confetti from 'canvas-confetti';

// Standard confetti burst for regular wins (x2+)
export function playWinConfetti(multiplier: number = 2) {
    const intensity = Math.min(multiplier / 10, 1); // Cap at 1
    confetti({
        particleCount: Math.floor(50 + intensity * 100),
        spread: 60 + intensity * 30,
        origin: { y: 0.6 },
        colors: ['#00FFFF', '#a855f7', '#22c55e', '#facc15']
    });
}

// Epic jackpot celebration with multiple bursts
export function playJackpotCelebration() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function () {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 100 * (timeLeft / duration);

        // Gold and purple confetti from both sides
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#facc15', '#fbbf24', '#f59e0b']
        });
        confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#a855f7', '#8b5cf6', '#7c3aed']
        });
    }, 250);
}

// Coin shower effect
export function playCoinShower() {
    confetti({
        particleCount: 80,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1.2,
        origin: { x: 0.5, y: 0 },
        colors: ['#facc15', '#fbbf24', '#f59e0b'],
        shapes: ['circle'],
        scalar: 1.2
    });
}

// Screen shake effect for jackpot (CSS animation applied to body)
export function playScreenShake() {
    const body = document.body;
    body.style.animation = 'jackpot-shake 0.6s ease-out';

    // Add shake keyframes if not exists
    if (!document.getElementById('shake-styles')) {
        const style = document.createElement('style');
        style.id = 'shake-styles';
        style.textContent = `
            @keyframes jackpot-shake {
                0%, 100% { transform: translateX(0) translateY(0); }
                10% { transform: translateX(-8px) translateY(-3px); }
                20% { transform: translateX(8px) translateY(3px); }
                30% { transform: translateX(-6px) translateY(-2px); }
                40% { transform: translateX(6px) translateY(2px); }
                50% { transform: translateX(-4px) translateY(-1px); }
                60% { transform: translateX(4px) translateY(1px); }
                70% { transform: translateX(-2px); }
                80% { transform: translateX(2px); }
                90% { transform: translateX(-1px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove animation after it completes
    setTimeout(() => {
        body.style.animation = '';
    }, 600);
}

// Big win particles burst (for 4 match)
export function playBigWinBurst() {
    // Center burst
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#00FFFF', '#22c55e', '#facc15', '#f472b6'],
        startVelocity: 40,
        ticks: 100
    });
    // Side bursts
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#a855f7', '#8b5cf6']
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#22c55e', '#10b981']
        });
    }, 200);
}
