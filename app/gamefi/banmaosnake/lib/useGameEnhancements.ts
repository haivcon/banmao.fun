// useGameEnhancements.ts — Hooks for upgrades 2,5,6,7,8
import { useState, useEffect, useRef, useCallback } from 'react';

// ====== Upgrade 2: Claim Cooldown Timer ======
export function useClaimCooldown() {
    const [cooldownEnd, setCooldownEnd] = useState<number>(0);
    const [cooldownLeft, setCooldownLeft] = useState<number>(0);

    useEffect(() => {
        if (cooldownEnd <= 0) { setCooldownLeft(0); return; }
        const tick = () => {
            const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
            setCooldownLeft(left);
            if (left <= 0) setCooldownEnd(0);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [cooldownEnd]);

    const startCooldown = useCallback((seconds: number) => {
        setCooldownEnd(Date.now() + seconds * 1000);
    }, []);

    // Parse rate limit error for retry-after
    const handleRateLimitError = useCallback((errorMsg: string) => {
        // Try to extract seconds from error message or default to 60s
        const match = errorMsg.match(/(\d+)\s*(?:seconds?|s)/i);
        if (match) {
            startCooldown(parseInt(match[1]));
        } else {
            startCooldown(60); // Default 60s cooldown
        }
    }, [startCooldown]);

    const formatCooldown = useCallback((): string => {
        if (cooldownLeft <= 0) return '';
        const m = Math.floor(cooldownLeft / 60);
        const s = cooldownLeft % 60;
        return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
    }, [cooldownLeft]);

    return { cooldownLeft, cooldownEnd, startCooldown, handleRateLimitError, formatCooldown };
}

// ====== Upgrade 5: Claim History ======
export interface ClaimRecord {
    txHash: string;
    amount: string;
    timestamp: number;
}

export function useClaimHistory(playerAddress: string | undefined) {
    const [claims, setClaims] = useState<ClaimRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fetchClaims = useCallback(async () => {
        if (!playerAddress) return;
        setLoading(true);
        try {
            const r = await fetch(`/api/snake-claims?player=${playerAddress}&limit=20`);
            const data = await r.json();
            if (data.success) setClaims(data.claims || []);
        } catch {
            // silent fail
        }
        setLoading(false);
    }, [playerAddress]);

    const toggleHistory = useCallback(() => {
        setShowHistory(prev => {
            if (!prev && claims.length === 0) fetchClaims();
            return !prev;
        });
    }, [claims.length, fetchClaims]);

    return { claims, loading, showHistory, toggleHistory, fetchClaims };
}

// ====== Upgrade 6: Game Replay (localStorage) ======
export interface MoveRecord {
    d: string;
    t: number;
}

export interface ReplayData {
    moves: MoveRecord[];
    score: number;
    timestamp: number;
}

const REPLAY_KEY = 'banmao_snake_best_replay';

export function useGameReplay() {
    const [bestReplay, setBestReplay] = useState<ReplayData | null>(null);
    const [isReplaying, setIsReplaying] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(REPLAY_KEY);
            if (saved) setBestReplay(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const saveReplayIfBest = useCallback((movesArr: MoveRecord[], currentScore: number) => {
        if (!bestReplay || currentScore > bestReplay.score) {
            const replay: ReplayData = {
                moves: movesArr.slice(-500), // Last 500 moves max
                score: currentScore,
                timestamp: Date.now()
            };
            setBestReplay(replay);
            try {
                localStorage.setItem(REPLAY_KEY, JSON.stringify(replay));
            } catch { /* storage full */ }
        }
    }, [bestReplay]);

    return { bestReplay, isReplaying, setIsReplaying, saveReplayIfBest };
}

// ====== Upgrade 7: Progressive Difficulty ======
export interface DifficultyLevel {
    name: string;
    emoji: string;
    color: string;
    obsInterval: number;  // ms between obstacle spawns
    speedBoost: number;   // extra speed reduction per item
    minSpeed: number;     // minimum tick speed (faster = lower)
}

const DIFFICULTY_BRACKETS: { threshold: number; level: DifficultyLevel }[] = [
    { threshold: 0, level: { name: 'Easy', emoji: '🟢', color: '#22c55e', obsInterval: 15000, speedBoost: 1, minSpeed: 50 } },
    { threshold: 200, level: { name: 'Medium', emoji: '🟡', color: '#eab308', obsInterval: 12000, speedBoost: 2, minSpeed: 42 } },
    { threshold: 500, level: { name: 'Hard', emoji: '🔴', color: '#ef4444', obsInterval: 8000, speedBoost: 3, minSpeed: 35 } },
    { threshold: 1000, level: { name: 'Insane', emoji: '💀', color: '#a855f7', obsInterval: 5000, speedBoost: 4, minSpeed: 28 } },
];

export function getDifficultyForScore(score: number): DifficultyLevel {
    let result = DIFFICULTY_BRACKETS[0].level;
    for (const bracket of DIFFICULTY_BRACKETS) {
        if (score >= bracket.threshold) result = bracket.level;
    }
    return result;
}

// ====== Upgrade 8: Offline Detection ======
export function useOfflineDetection(onOffline?: () => void, onOnline?: () => void) {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            onOffline?.();
        };
        const handleOnline = () => {
            setIsOffline(false);
            onOnline?.();
        };

        // Check initial state
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
        }

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [onOffline, onOnline]);

    return { isOffline };
}
