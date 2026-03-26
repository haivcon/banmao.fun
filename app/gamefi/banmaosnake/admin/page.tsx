"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import SharedProviders from "../../../providers";
import SnakeTab from "../../admin/components/SnakeTab";
import { snakeEn, snakeVi } from "./i18n";
import "../globals.css";
import { SNAKE_ABI } from "../lib/abis";
import { SNAKE_CONTRACT_ADDRESS } from "../lib/constants";

// Backend config mock (in real app, fetch from API)
const mockBackendConfig: Record<string, string> = {};
const mockSaveBackendConfig = async (key: string, value: string) => {
    mockBackendConfig[key] = value;
};

export default function SnakeAdminPage() {
    return (
        <SharedProviders>
            <SnakeAdminContent />
        </SharedProviders>
    );
}

function SnakeAdminContent() {
    const { address, isConnected } = useAccount();
    const [lang, setLang] = useState<'en' | 'vi'>('vi');
    const t = lang === 'en' ? snakeEn : snakeVi;

    // Check owner from contract
    const { data: owner, isLoading } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: "owner",
    });

    const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

    useEffect(() => {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('vi')) {
            setLang('vi');
        } else {
            setLang('en');
        }
    }, []);

    // Show only ConnectButton for non-owners
    if (!isConnected || !isOwner) {
        if (isLoading) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                }}>
                    Loading...
                </div>
            );
        }
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <ConnectButton />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <Toaster position="top-center" />

            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid rgba(34, 197, 94, 0.2)',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, color: '#22c55e' }}>
                        🐍 {t.title}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {t.subtitle}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '6px 12px',
                            borderRadius: 8,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                        }}
                    >
                        {lang === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}
                    </button>

                    <a href="/gamefi/banmaosnake" style={{
                        color: '#22c55e',
                        textDecoration: 'none',
                        fontSize: 13,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        ← {t.backToGame}
                    </a>
                    <a href="/gamefi/admin" style={{
                        color: '#a855f7',
                        textDecoration: 'none',
                        fontSize: 13,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)'
                    }}>
                        🏠 {t.adminHub}
                    </a>
                    <ConnectButton />
                </div>
            </header>

            {/* Content */}
            <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
                <SnakeTab
                    backendConfig={mockBackendConfig}
                    saveBackendConfig={mockSaveBackendConfig}
                    t={t}
                    isOwner={true}
                    isAdmin={true}
                />
            </main>

            {/* Help Section */}
            <section style={{ maxWidth: 1000, margin: '20px auto', padding: '0 24px' }}>
                <details style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 12,
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    padding: 16
                }}>
                    <summary style={{ cursor: 'pointer', color: '#22c55e', fontWeight: 'bold' }}>
                        ℹ️ {t.help.title}
                    </summary>
                    <div style={{ marginTop: 16, color: '#94a3b8', fontSize: 14, lineHeight: 1.8 }}>
                        <h4 style={{ color: '#e2e8f0', marginBottom: 8 }}>{t.help.minClaim}</h4>
                        <p>{t.help.minClaimDesc}</p>

                        <h4 style={{ color: '#e2e8f0', marginTop: 16, marginBottom: 8 }}>{t.help.caps}</h4>
                        <ul style={{ paddingLeft: 20 }}>
                            <li><strong>Daily Player Cap:</strong> {t.help.dailyCapDesc}</li>
                            <li><strong>Hourly Signer Cap:</strong> {t.help.hourlyCapDesc}</li>
                        </ul>

                        <h4 style={{ color: '#e2e8f0', marginTop: 16, marginBottom: 8 }}>{t.help.signer}</h4>
                        <p>{t.help.signerDesc}</p>

                        <h4 style={{ color: '#ef4444', marginTop: 16, marginBottom: 8 }}>{t.help.danger}</h4>
                        <p>{t.help.dangerDesc}</p>
                    </div>
                </details>
            </section>
        </div>
    );
}
