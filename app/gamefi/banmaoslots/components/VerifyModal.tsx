"use client";

import React, { useState } from 'react';
import { keccak256, encodePacked } from 'viem';
import { SlotsTranslations } from '../lib/i18n';
import { SLOT_SYMBOLS } from '../lib/abis';

interface VerifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: SlotsTranslations;
}

export default function VerifyModal({ isOpen, onClose, t }: VerifyModalProps) {
    const [seed, setSeed] = useState("");
    const [blockhash, setBlockhash] = useState("");
    const [player, setPlayer] = useState("");
    const [nonce, setNonce] = useState("");
    const [poolId, setPoolId] = useState("");
    const [spinIndex, setSpinIndex] = useState(""); // Optional: for multi-spin derivation
    const [result, setResult] = useState<{
        symbols: string[];
        symbolIndexes: number[];
        hash: string;
        random: bigint;
        derivedSeed?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const verifyResult = () => {
        setError(null);
        setResult(null);

        if (!seed || !blockhash || !player || !poolId) {
            setError(t.verifyErrorMissing || "Please fill all required fields");
            return;
        }

        try {
            // Validate inputs
            let seedBytes32 = seed.startsWith("0x") ? seed : `0x${seed}`;
            const blockhashBytes32 = blockhash.startsWith("0x") ? blockhash : `0x${blockhash}`;
            const playerAddress = player.startsWith("0x") ? player : `0x${player}`;
            const nonceValue = BigInt(nonce || "0");
            const poolIdValue = BigInt(poolId || "0");

            if (seedBytes32.length !== 66) {
                setError(t.verifyErrorSeed || "Invalid seed format");
                return;
            }
            if (blockhashBytes32.length !== 66) {
                setError(t.verifyErrorHash || "Invalid blockhash format");
                return;
            }
            if (playerAddress.length !== 42) {
                setError("Invalid player address format");
                return;
            }

            // For multi-spin: derive the actual seed for this spin index
            let actualSeed = seedBytes32;
            let derivedSeedDisplay: string | undefined;
            if (spinIndex && spinIndex.trim() !== "") {
                const spinIndexNum = BigInt(spinIndex);
                // Contract: bytes32 spinSeed = keccak256(abi.encodePacked(seed, i))
                actualSeed = keccak256(encodePacked(
                    ["bytes32", "uint256"],
                    [seedBytes32 as `0x${string}`, spinIndexNum]
                ));
                derivedSeedDisplay = actualSeed;
            }

            // Calculate entropy hash (SAME as contract)
            // Contract: keccak256(abi.encodePacked(seed, blockHashValue, player, nonces[player], poolId))
            const entropy = keccak256(
                encodePacked(
                    ["bytes32", "bytes32", "address", "uint256", "uint256"],
                    [
                        actualSeed as `0x${string}`,
                        blockhashBytes32 as `0x${string}`,
                        playerAddress as `0x${string}`,
                        nonceValue,
                        poolIdValue
                    ]
                )
            );

            // Convert to random number
            const random = BigInt(entropy);

            // Calculate 5 symbols using weighted probabilities (same as contract)
            // Symbol probabilities: [50, 80, 150, 200, 250, 270] total = 1000
            const symbolProbabilities = [50, 80, 150, 200, 250, 270];
            const totalWeight = 1000;

            const symbolIndexes: number[] = [];
            let tempRandom = random;

            for (let i = 0; i < 5; i++) {
                // Extract position for this symbol
                const position = Number(tempRandom % BigInt(totalWeight));
                tempRandom = tempRandom / BigInt(totalWeight);

                // Find symbol based on weighted probability
                let cumulative = 0;
                let selectedSymbol = 5; // Default to last symbol
                for (let s = 0; s < 6; s++) {
                    cumulative += symbolProbabilities[s];
                    if (position < cumulative) {
                        selectedSymbol = s;
                        break;
                    }
                }
                symbolIndexes.push(selectedSymbol);
            }

            const symbols = symbolIndexes.map((idx) => SLOT_SYMBOLS[idx]);

            setResult({
                symbols,
                symbolIndexes,
                hash: entropy,
                random,
                derivedSeed: derivedSeedDisplay
            });
        } catch (err) {
            setError(t.verifyErrorInvalid || "Invalid input format");
            console.error(err);
        }
    };

    if (!isOpen) return null;

    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '4px'
    };

    const labelStyle = {
        display: 'block',
        color: '#e2e8f0',
        marginBottom: '6px',
        fontSize: '12px',
        fontWeight: 600 as const
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10005,
                padding: '20px',
                backdropFilter: 'blur(5px)'
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, #1a0f2e 0%, #0a0617 100%)',
                    clipPath: 'polygon(0 20px, 20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px))',
                    padding: '0',
                    maxWidth: '600px',
                    width: '100%',
                    border: '2px solid rgba(168, 85, 247, 0.4)',
                    boxShadow: '0 0 60px rgba(168, 85, 247, 0.2), 0 20px 40px rgba(0,0,0,0.5)',
                    fontFamily: "'Space Mono', monospace"
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(250, 204, 21, 0.1) 100%)',
                    borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        fontFamily: "'Space Mono', monospace",
                        textTransform: 'uppercase',
                        fontSize: '18px',
                        color: '#facc15',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🔐 {t.manualVerification} ({t.provablyFair})
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            color: '#e2e8f0',
                            fontSize: '18px',
                            clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >✕</button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
                        {t.verifyDesc}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Seed */}
                        <div>
                            <label style={labelStyle}>🧬 Seed (Main Seed from browser):</label>
                            <input
                                type="text"
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="0x..."
                                style={inputStyle}
                            />
                        </div>

                        {/* Spin Index - Optional */}
                        <div>
                            <label style={labelStyle}>
                                🔢 Spin Index (Optional - for multi-spin, 0-based):
                                <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
                                    Leave empty for single spin
                                </span>
                            </label>
                            <input
                                type="number"
                                value={spinIndex}
                                onChange={(e) => setSpinIndex(e.target.value)}
                                placeholder="0, 1, 2..."
                                min="0"
                                style={inputStyle}
                            />
                        </div>

                        {/* Blockhash */}
                        <div>
                            <label style={labelStyle}>🔗 Blockhash (from transaction block):</label>
                            <input
                                type="text"
                                value={blockhash}
                                onChange={(e) => setBlockhash(e.target.value)}
                                placeholder="0x..."
                                style={inputStyle}
                            />
                        </div>

                        {/* Player Address */}
                        <div>
                            <label style={labelStyle}>👤 Player Address:</label>
                            <input
                                type="text"
                                value={player}
                                onChange={(e) => setPlayer(e.target.value)}
                                placeholder="0x..."
                                style={inputStyle}
                            />
                        </div>

                        {/* Nonce */}
                        <div>
                            <label style={labelStyle}>🔄 Nonce (player's spin count before this spin):</label>
                            <input
                                type="number"
                                value={nonce}
                                onChange={(e) => setNonce(e.target.value)}
                                placeholder="0"
                                min="0"
                                style={inputStyle}
                            />
                        </div>

                        {/* Pool ID */}
                        <div>
                            <label style={labelStyle}>🎱 Pool ID:</label>
                            <input
                                type="number"
                                value={poolId}
                                onChange={(e) => setPoolId(e.target.value)}
                                placeholder="1"
                                min="1"
                                style={inputStyle}
                            />
                        </div>

                        <button
                            onClick={verifyResult}
                            style={{
                                padding: '12px',
                                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginTop: '10px'
                            }}
                        >
                            🔍 {t.verifyResultBtn}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '20px',
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            ❌ {error}
                        </div>
                    )}

                    {result && (
                        <div style={{
                            marginTop: '20px',
                            padding: '20px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            animation: 'scaleIn 0.3s ease'
                        }}>
                            <h3 style={{ color: '#22c55e', margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ✅ {t.verifiedResult}
                            </h3>

                            {/* Show derived seed if multi-spin */}
                            {result.derivedSeed && (
                                <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                                    <div style={{ fontSize: '10px', color: '#fbbf24', marginBottom: '4px' }}>
                                        🧬 Derived Spin Seed (for spin #{spinIndex}):
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                        {result.derivedSeed}
                                    </div>
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '8px',
                                marginBottom: '16px'
                            }}>
                                {result.symbols.map((symbol, i) => (
                                    <div key={i} style={{
                                        width: '50px',
                                        height: '50px',
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px',
                                        borderRadius: '4px'
                                    }}>
                                        {symbol}
                                    </div>
                                ))}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                <div>Entropy Hash: {result.hash}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

