"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import { Toaster } from "react-hot-toast";
import SharedProviders from "../../../providers";
import SlotsTab from "../../admin/components/SlotsTab";
import { slotsEn, slotsVi } from "./i18n";
import "../globals.css";
import { SLOTS_ABI, SLOTS_CONTRACT_ADDRESS } from "../lib/abis";

export default function SlotsAdminPage() {
    return (
        <SharedProviders>
            <SlotsAdminContent />
        </SharedProviders>
    );
}

function SlotsAdminContent() {
    const { address, isConnected } = useAccount();
    const [lang, setLang] = useState<'en' | 'vi'>('vi');
    const t = lang === 'en' ? slotsEn : slotsVi;

    // Check owner from contract
    const { data: owner, isLoading } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "owner",
    });

    const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

    // Detect browser language on mount
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
                borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, color: '#facc15' }}>
                        🎰 {t.title}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {t.subtitle}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Language Switcher */}
                    <button
                        onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '6px 12px',
                            clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                        }}
                    >
                        {lang === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}
                    </button>

                    {/* Back Links */}
                    <a href="/gamefi/banmaoslots" style={{
                        color: '#a855f7',
                        textDecoration: 'none',
                        fontSize: 13,
                        padding: '6px 12px',
                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)'
                    }}>
                        ← {t.backToGame}
                    </a>
                    <a href="/gamefi/admin" style={{
                        color: '#22c55e',
                        textDecoration: 'none',
                        fontSize: 13,
                        padding: '6px 12px',
                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        🏠 {t.adminHub}
                    </a>
                    <ConnectButton />
                </div>
            </header>

            {/* Content */}
            <main style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
                <SlotsTab t={t} isAdmin={true} />
            </main>
        </div>
    );
}
