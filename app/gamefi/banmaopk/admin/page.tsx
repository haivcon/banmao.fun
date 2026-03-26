/**
 * BanMaoPK Admin Dashboard
 * Owner-only admin panel for contract configuration
 */
"use client";

import React, { useState, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import SharedProviders from "../../../providers";
import { BANMAOPK_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI } from "../lib/abis";
import { DraggablePanel, PanelTaskbar } from "../components/DraggablePanel";
import ConfigPanel from "./components/ConfigPanel";
import MatchManagementPanel from "./components/MatchManagementPanel";
import RecoverTokenPanel from "./components/RecoverTokenPanel";
import "../globals.css";

export default function PKAdminDashboard() {
    return (
        <SharedProviders>
            <PKAdminContent />
        </SharedProviders>
    );
}

type PanelId = "config" | "matches" | "recover";

function PKAdminContent() {
    const { address, isConnected } = useAccount();

    // Check if owner
    const { data: owner } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "owner",
    });

    const isOwner = isConnected && owner && address?.toLowerCase() === owner.toLowerCase();

    // Panel States
    const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
        config: false,
        matches: false,
        recover: false,
    });
    const [minimizedPanels, setMinimizedPanels] = useState<PanelId[]>([]);
    const [panelZIndices, setPanelZIndices] = useState<Record<PanelId, number>>({
        config: 100,
        matches: 101,
        recover: 102,
    });
    const [topZIndex, setTopZIndex] = useState(103);

    // Panel Controls
    const openPanel = useCallback((id: PanelId) => {
        setOpenPanels((prev) => ({ ...prev, [id]: true }));
        setMinimizedPanels((prev) => prev.filter((p) => p !== id));
        setPanelZIndices((prev) => ({ ...prev, [id]: topZIndex }));
        setTopZIndex((prev) => prev + 1);
    }, [topZIndex]);

    const closePanel = useCallback((id: PanelId) => {
        setOpenPanels((prev) => ({ ...prev, [id]: false }));
        setMinimizedPanels((prev) => prev.filter((p) => p !== id));
    }, []);

    const minimizePanel = useCallback((id: PanelId) => {
        setOpenPanels((prev) => ({ ...prev, [id]: false }));
        setMinimizedPanels((prev) => [...prev.filter((p) => p !== id), id]);
    }, []);

    const focusPanel = useCallback((id: PanelId) => {
        setPanelZIndices((prev) => ({ ...prev, [id]: topZIndex }));
        setTopZIndex((prev) => prev + 1);
    }, [topZIndex]);

    const restorePanel = useCallback((id: string) => {
        openPanel(id as PanelId);
    }, [openPanel]);

    const getPanelTitle = (id: PanelId) => {
        if (id === "config") return "Config";
        if (id === "matches") return "Match Mgmt";
        if (id === "recover") return "Recover";
        return id;
    };

    const getPanelIcon = (id: PanelId) => {
        if (id === "config") return "⚙️";
        if (id === "matches") return "🎯";
        if (id === "recover") return "🔧";
        return "📋";
    };

    if (!isConnected) {
        return (
            <div className="pk-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Connect Wallet</h2>
                    <p style={{ color: '#9ca3af' }}>Please connect your wallet to access admin panel</p>
                </div>
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="pk-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'rgba(239,68,68,0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(239,68,68,0.3)'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>Access Denied</h2>
                    <p style={{ color: '#fca5a5' }}>Only contract owner can access this page</p>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '12px', fontFamily: 'monospace' }}>
                        Owner: {owner}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="pk-container">
            {/* Header */}
            <header className="pk-header">
                <div className="pk-header-content">
                    <h1 className="pk-title">
                        <span className="pk-icon">🛡️</span>
                        Admin Dashboard
                    </h1>
                    <p className="pk-subtitle">BanMaoPK V11 Contract Management</p>
                </div>
            </header>

            {/* Admin Buttons */}
            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                padding: '20px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => openPanel("config")}
                    className="pk-btn pk-btn-primary"
                    style={{ minWidth: '160px', padding: '16px 24px' }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚙️</div>
                    <div style={{ fontWeight: 700 }}>Config</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>Deposit, Overtime, Shares</div>
                </button>

                <button
                    onClick={() => openPanel("matches")}
                    className="pk-btn pk-btn-secondary"
                    style={{ minWidth: '160px', padding: '16px 24px' }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎯</div>
                    <div style={{ fontWeight: 700 }}>Match Mgmt</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>Create, Force Cancel</div>
                </button>

                <button
                    onClick={() => openPanel("recover")}
                    className="pk-btn pk-btn-secondary"
                    style={{ minWidth: '160px', padding: '16px 24px' }}
                >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔧</div>
                    <div style={{ fontWeight: 700 }}>Recover</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>Stuck Tokens</div>
                </button>
            </div>

            {/* Contract Info */}
            <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                padding: '20px',
            }}>
                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>Contract Address</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
                        {BANMAOPK_ADDRESS}
                    </div>
                </div>
            </div>

            {/* === DRAGGABLE PANELS === */}

            {/* Config Panel */}
            <DraggablePanel
                id="config"
                title="Contract Config"
                icon="⚙️"
                isOpen={openPanels.config}
                onClose={() => closePanel("config")}
                onMinimize={() => minimizePanel("config")}
                onFocus={() => focusPanel("config")}
                zIndex={panelZIndices.config}
                defaultPosition={{ x: 100, y: 80 }}
                defaultSize={{ width: 400, height: 500 }}
            >
                <ConfigPanel />
            </DraggablePanel>

            {/* Match Management Panel */}
            <DraggablePanel
                id="matches"
                title="Match Management"
                icon="🎯"
                isOpen={openPanels.matches}
                onClose={() => closePanel("matches")}
                onMinimize={() => minimizePanel("matches")}
                onFocus={() => focusPanel("matches")}
                zIndex={panelZIndices.matches}
                defaultPosition={{ x: 200, y: 100 }}
                defaultSize={{ width: 420, height: 480 }}
            >
                <MatchManagementPanel />
            </DraggablePanel>

            {/* Recover Token Panel */}
            <DraggablePanel
                id="recover"
                title="Recover Stuck Tokens"
                icon="🔧"
                isOpen={openPanels.recover}
                onClose={() => closePanel("recover")}
                onMinimize={() => minimizePanel("recover")}
                onFocus={() => focusPanel("recover")}
                zIndex={panelZIndices.recover}
                defaultPosition={{ x: 300, y: 120 }}
                defaultSize={{ width: 360, height: 320 }}
            >
                <RecoverTokenPanel />
            </DraggablePanel>

            {/* Taskbar */}
            <PanelTaskbar
                minimizedPanels={minimizedPanels.map((id) => ({
                    id,
                    title: getPanelTitle(id),
                    icon: getPanelIcon(id),
                }))}
                onRestore={restorePanel}
            />
        </div>
    );
}
