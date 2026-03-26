/**
 * ClaimPanel Component - FIXED VERSION
 * My Vault display with gold glow effects and claim animations
 * 
 * FIXES:
 * 1. Track user's participated rounds in localStorage
 * 2. Pass correct rounds to claim() function
 * 3. Get user rounds from contract when needed
 */
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { formatUnits } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import AnimatedSprite from "./AnimatedSprite";
import { LocaleStrings } from "../lib/i18n/types";
import { BANMAOFOMO_ADDRESS, STORAGE_KEYS, MAX_CLAIM_BATCH } from "../lib/constants";
import { BANMAOFOMO_ABI } from "../lib/abis";
import { playClaimSound } from "../lib/sounds";
import VaultHistory from "./VaultHistory";

// Sprite paths
const JACKPOT_CHEST_SPRITE = "/gamefi/banmaofomo/sprites/banmao_jackpot_chest.png";

interface ClaimPanelProps {
    personalVault: bigint;
    currentRound: bigint;
    t: LocaleStrings;
    onClaimSuccess?: () => void;
    // NEW: Pass user's participated rounds from parent
    userParticipatedRounds?: bigint[];
}

// Helper to get user rounds from localStorage
const getUserRoundsFromStorage = (address: string): number[] => {
    try {
        const stored = localStorage.getItem(`${STORAGE_KEYS.USER_ROUNDS}_${address.toLowerCase()}`);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error reading user rounds from storage:", e);
    }
    return [];
};

// Helper to save user rounds to localStorage
export const saveUserRoundToStorage = (address: string, roundId: number): void => {
    try {
        const existing = getUserRoundsFromStorage(address);
        if (!existing.includes(roundId)) {
            existing.push(roundId);
            // Keep only last 100 rounds to prevent bloat
            const trimmed = existing.slice(-100);
            localStorage.setItem(`${STORAGE_KEYS.USER_ROUNDS}_${address.toLowerCase()}`, JSON.stringify(trimmed));
        }
    } catch (e) {
        console.error("Error saving user round to storage:", e);
    }
};

// Helper to clear claimed rounds from storage
const clearClaimedRoundsFromStorage = (address: string): void => {
    try {
        localStorage.setItem(`${STORAGE_KEYS.USER_ROUNDS}_${address.toLowerCase()}`, JSON.stringify([]));
    } catch (e) {
        console.error("Error clearing user rounds from storage:", e);
    }
};

export default function ClaimPanel({
    personalVault,
    currentRound,
    t,
    onClaimSuccess,
    userParticipatedRounds = [],
}: ClaimPanelProps) {
    const { address, isConnected } = useAccount();
    const [prevVault, setPrevVault] = useState<number>(0);
    const [isGlowing, setIsGlowing] = useState(false);
    const prevVaultRef = useRef<number>(0);
    const [userRounds, setUserRounds] = useState<number[]>([]);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualRoundId, setManualRoundId] = useState("");
    const [manualRoundAdded, setManualRoundAdded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const currentVaultValue = Number(formatUnits(personalVault, 18));
    const hasRewards = personalVault > 0n;

    // Load user rounds from localStorage on mount
    useEffect(() => {
        if (address) {
            const storedRounds = getUserRoundsFromStorage(address);
            setUserRounds(storedRounds);
        }
    }, [address]);

    // Detect vault increase and trigger glow
    useEffect(() => {
        if (currentVaultValue > prevVaultRef.current && prevVaultRef.current > 0) {
            setIsGlowing(true);
            setTimeout(() => setIsGlowing(false), 2000);
        }
        setPrevVault(prevVaultRef.current);
        prevVaultRef.current = currentVaultValue;
    }, [currentVaultValue]);

    // Claim contract
    const {
        writeContract: claim,
        data: claimHash,
        isPending: isClaiming,
    } = useWriteContract();

    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
        useWaitForTransactionReceipt({ hash: claimHash });

    // Handle claim success with confetti
    useEffect(() => {
        if (isClaimSuccess) {
            playClaimSound();

            // Launch confetti celebration
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.7 },
                colors: ['#ffd700', '#ff6b35', '#22d3ee'],
            });

            // Side bursts
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#ffd700'],
                });
                confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#ffd700'],
                });
            }, 150);

            // Clear claimed rounds from storage after successful claim
            if (address) {
                clearClaimedRoundsFromStorage(address);
                setUserRounds([]);
            }

            // Dispatch custom event for VaultHistory to capture claim immediately
            window.dispatchEvent(new CustomEvent('banmao-claim-success', {
                detail: {
                    amount: currentVaultValue,
                    txHash: claimHash || '',
                }
            }));

            onClaimSuccess?.();
        }
    }, [isClaimSuccess, onClaimSuccess, address]);

    /**
     * FIXED: Generate correct round IDs to claim
     * 
     * Logic:
     * 1. Include all rounds user has attacked (from localStorage/props)
     * 2. Include current round (for potential pending dividends)
     * 3. Include recent rounds as fallback
     * 4. Limit to MAX_CLAIM_BATCH (50)
     */
    const getClaimableRounds = useCallback((): bigint[] => {
        const roundSet = new Set<number>();
        const current = Number(currentRound);

        // 1. Add user's participated rounds from localStorage
        userRounds.forEach(r => roundSet.add(r));

        // 2. Add rounds from props (passed from parent)
        userParticipatedRounds.forEach(r => roundSet.add(Number(r)));

        // 3. Add current round
        if (current > 0) {
            roundSet.add(current);
        }

        // 4. Add recent rounds as fallback (last 20 rounds)
        // This ensures we don't miss any dividends from rounds we might not have tracked
        for (let i = 1; i <= 20; i++) {
            const roundId = current - i;
            if (roundId > 0) {
                roundSet.add(roundId);
            }
        }

        // Convert to sorted array and limit to MAX_CLAIM_BATCH
        const roundsArray = Array.from(roundSet)
            .filter(r => r > 0)
            .sort((a, b) => b - a) // Newest first
            .slice(0, MAX_CLAIM_BATCH);

        return roundsArray.map(r => BigInt(r));
    }, [currentRound, userRounds, userParticipatedRounds]);

    const handleClaim = useCallback(() => {
        if (!address || !hasRewards) return;

        console.log("Calling settleGame() - Smart Settle");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (claim as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "settleGame",
            args: [],
        });
    }, [address, hasRewards, claim]);

    const isLoading = isClaiming || isClaimConfirming;

    // Display number of tracked rounds
    const trackedRoundsCount = userRounds.length;

    return (
        <motion.div
            className={`claim-panel ${isGlowing ? "vault-updated" : ""}`}
            data-tour="fomo-claim"
            animate={isGlowing ? {
                boxShadow: [
                    "0 0 20px rgba(255, 215, 0, 0.3)",
                    "0 0 50px rgba(255, 215, 0, 0.8)",
                    "0 0 20px rgba(255, 215, 0, 0.3)",
                ],
            } : {}}
            transition={{ duration: 1, repeat: isGlowing ? 1 : 0 }}
        >
            <h3 className="claim-title">
                <span className="title-icon">🏦</span>
                {t.claimTitle}
            </h3>

            {/* Vault Display with CountUp */}
            <motion.div
                className="vault-display"
                animate={isGlowing ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.5 }}
            >
                <AnimatedSprite
                    src={JACKPOT_CHEST_SPRITE}
                    alt="Vault"
                    width={60}
                    height={60}
                    preset={["bounce", "glow"]}
                    glowColor="gold"
                    className="vault-icon"
                />
                <div className="vault-info">
                    <span className="vault-label">{t.personalVault}</span>
                    <motion.span
                        className="vault-value"
                        animate={hasRewards ? {
                            textShadow: [
                                "0 0 5px rgba(255, 215, 0, 0.3)",
                                "0 0 15px rgba(255, 215, 0, 0.6)",
                                "0 0 5px rgba(255, 215, 0, 0.3)",
                            ],
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <CountUp
                            start={prevVault}
                            end={currentVaultValue}
                            duration={1.5}
                            decimals={2}
                            separator=","
                            preserveValue
                            formattingFn={(n) => {
                                // Remove trailing zeros for professional display
                                const formatted = parseFloat(n.toFixed(2));
                                return formatted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                            }}
                        />
                        <span className="vault-currency"> $BANMAO</span>
                    </motion.span>
                </div>
            </motion.div>

            {/* Tracked Rounds Info */}
            {trackedRoundsCount > 0 && (
                <div style={{ fontSize: "11px", color: "#888", textAlign: "center", marginTop: "8px" }}>
                    📊 Đang theo dõi {trackedRoundsCount} vòng đã tham gia
                </div>
            )}

            {/* Increase indicator */}
            <AnimatePresence>
                {isGlowing && (
                    <motion.div
                        className="vault-increase"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span className="increase-arrow">▲</span>
                        <span>+{(currentVaultValue - prevVault).toFixed(2)}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Claim Button */}
            <div className="claim-actions">
                {!isConnected ? (
                    <motion.button
                        className="claim-btn disabled"
                        disabled
                        whileHover={{ scale: 1.02 }}
                    >
                        {t.connectWallet}
                    </motion.button>
                ) : !hasRewards ? (
                    <motion.button
                        className="claim-btn disabled"
                        disabled
                        animate={{ opacity: [0.5, 0.7, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {t.noRewards}
                    </motion.button>
                ) : (
                    <motion.button
                        className="claim-btn primary"
                        onClick={handleClaim}
                        disabled={isLoading}
                        whileHover={{
                            scale: 1.03,
                            boxShadow: "0 0 25px rgba(255, 215, 0, 0.6)"
                        }}
                        whileTap={{ scale: 0.97 }}
                        animate={{
                            boxShadow: [
                                "0 0 10px rgba(255, 215, 0, 0.3)",
                                "0 0 20px rgba(255, 215, 0, 0.5)",
                                "0 0 10px rgba(255, 215, 0, 0.3)",
                            ],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {isLoading ? (
                            <span className="loading-text">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    ⏳
                                </motion.span>
                                {" "}{t.claiming}
                            </span>
                        ) : (
                            <>
                                <motion.span
                                    className="claim-icon"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                                >
                                    💰
                                </motion.span>
                                {t.claimAll}
                            </>
                        )}
                    </motion.button>
                )}
            </div>

            {/* Success Message */}
            <AnimatePresence>
                {isClaimSuccess && (
                    <motion.div
                        className="claim-success"
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <motion.span
                            className="success-icon"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 0.5 }}
                        >
                            ✅
                        </motion.span>
                        {t.claimSuccess}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Distribution Info */}
            <div className="claim-info">
                <div className="info-row">
                    <span className="info-icon">📊</span>
                    <span className="info-text">{t.distributionList[1]}</span>
                </div>
            </div>

            {/* Manual Round Entry - For lost history */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    {showManualInput ? t.cancel || "Cancel" : t.lostRewards || "Lost Rewards? Check Manual Round"}
                </button>

                {showManualInput && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <input
                            type="number"
                            placeholder="Round ID"
                            value={manualRoundId}
                            onChange={(e) => setManualRoundId(e.target.value)}
                            style={{
                                width: '80px',
                                padding: '4px',
                                borderRadius: '4px',
                                border: '1px solid #444',
                                background: '#222',
                                color: '#fff',
                                fontSize: '0.8rem'
                            }}
                        />
                        <button
                            onClick={() => {
                                const rid = parseInt(manualRoundId);
                                if (rid > 0 && address) {
                                    saveUserRoundToStorage(address, rid);
                                    setUserRounds(getUserRoundsFromStorage(address));
                                    setManualRoundId("");
                                    setManualRoundAdded(true);
                                    setTimeout(() => setManualRoundAdded(false), 2000);
                                }
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#ff6b35',
                                color: '#fff',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Check
                        </button>
                    </div>
                )}
                {manualRoundAdded && (
                    <div style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: '4px' }}>
                        ✓ Round added to check list
                    </div>
                )}
            </div>

            {/* Vault History Section */}
            {isConnected && (
                <div style={{ marginTop: '16px' }}>
                    <button
                        className={`vault-history-toggle ${showHistory ? 'open' : ''}`}
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        📜 {showHistory ? 'Hide' : 'View'} Transaction History
                        <span style={{ marginLeft: 'auto', fontSize: '16px', transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            ▼
                        </span>
                    </button>

                    <AnimatePresence>
                        {showHistory && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <VaultHistory t={t} currentVault={personalVault} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}
