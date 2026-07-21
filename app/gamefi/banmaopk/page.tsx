/**
 * BanMao PK Battle Platform - Dashboard Page (Sàn Đấu)
 * With Draggable Panels for Create, Profile, and Match Room
 */
"use client";

import React, { useState, useCallback } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import SharedProviders from "../../providers";
import { BANMAOPK_ADDRESS } from "./lib/constants";
import { BANMAOPK_ABI } from "./lib/abis";
import MatchCard from "./components/MatchCard";
import PKChallengeCard from "./components/PKChallengeCard";
import { DraggablePanel, PanelTaskbar } from "./components/DraggablePanel";
import CreateChallengePanel from "./components/CreateChallengePanel";
import ProfilePanel from "./components/ProfilePanel";
import MatchRoomPanel from "./components/MatchRoomPanel";
import "./globals.css";
import { ConnectButton } from '../../components/wallet/WalletConnection';

export default function PKDashboard() {
    return (
        <SharedProviders>
            <PKDashboardContent />
        </SharedProviders>
    );
}

type PanelId = "create" | "profile" | "matchroom";

function PKDashboardContent() {
    const [activeTab, setActiveTab] = useState<"matches" | "challenges">("matches");

    // Panel States
    const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>({
        create: false,
        profile: false,
        matchroom: false,
    });
    const [minimizedPanels, setMinimizedPanels] = useState<PanelId[]>([]);
    const [panelZIndices, setPanelZIndices] = useState<Record<PanelId, number>>({
        create: 100,
        profile: 101,
        matchroom: 102,
    });
    const [topZIndex, setTopZIndex] = useState(103);

    // Selected match for MatchRoomPanel
    const [selectedMatchId, setSelectedMatchId] = useState<bigint | null>(null);

    // Read current IDs to iterate
    const { data: currentMatchId, refetch: refetchMatches } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "currentMatchId",
    });

    const { data: currentChallengeId, refetch: refetchChallenges } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "currentChallengeId",
    });

    const { data: minDeposit } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "minChallengeDeposit",
    });

    // Generate IDs for rendering (latest first)
    const matchIds = currentMatchId
        ? Array.from({ length: Math.min(Number(currentMatchId), 20) }, (_, i) => BigInt(Number(currentMatchId) - i))
        : [];

    const challengeIds = currentChallengeId
        ? Array.from({ length: Math.min(Number(currentChallengeId), 20) }, (_, i) => BigInt(Number(currentChallengeId) - i))
        : [];

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
        if (id === "matchroom") setSelectedMatchId(null);
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

    // Open match room panel
    const openMatchRoom = useCallback((matchId: bigint) => {
        setSelectedMatchId(matchId);
        openPanel("matchroom");
    }, [openPanel]);

    const handleChallengeCreated = useCallback(() => {
        refetchChallenges();
    }, [refetchChallenges]);

    // Panel title resolver
    const getPanelTitle = (id: PanelId) => {
        if (id === "create") return "Tạo Kèo";
        if (id === "profile") return "Profile";
        if (id === "matchroom") return `Match #${selectedMatchId?.toString() || ""}`;
        return id;
    };

    const getPanelIcon = (id: PanelId) => {
        if (id === "create") return "🎯";
        if (id === "profile") return "👤";
        if (id === "matchroom") return "🥊";
        return "📋";
    };

    return (
        <div className="pk-container">
            {/* Header */}
            <header className="pk-header">
                <div className="pk-header-content">
                    <h1 className="pk-title">
                        <span className="pk-icon">⚔️</span>
                        PK Battle Arena
                    </h1>
                    <p className="pk-subtitle">Popularity Wars - 85% to Voters!</p>
                </div>
                <div className="pk-header-actions">
                    <button
                        onClick={() => openPanel("create")}
                        className="pk-btn pk-btn-primary"
                    >
                        🎯 Tạo Kèo Mới
                    </button>
                    <button
                        onClick={() => openPanel("profile")}
                        className="pk-btn pk-btn-secondary"
                    >
                        👤 Profile
                    </button>
                    <ConnectButton />
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="pk-tabs">
                <button
                    className={`pk-tab ${activeTab === "matches" ? "active" : ""}`}
                    onClick={() => setActiveTab("matches")}
                >
                    🥊 Trận Đấu ({matchIds.length})
                </button>
                <button
                    className={`pk-tab ${activeTab === "challenges" ? "active" : ""}`}
                    onClick={() => setActiveTab("challenges")}
                >
                    🎣 Săn Kèo ({challengeIds.length})
                </button>
            </div>

            {/* Content */}
            <main className="pk-main">
                {activeTab === "matches" ? (
                    <div className="pk-grid">
                        {matchIds.length === 0 ? (
                            <div className="pk-empty">
                                <div className="pk-empty-icon">🏟️</div>
                                <p>Chưa có trận đấu nào</p>
                                <button
                                    onClick={() => openPanel("create")}
                                    className="pk-btn pk-btn-primary"
                                >
                                    Tạo Kèo Đầu Tiên
                                </button>
                            </div>
                        ) : (
                            matchIds.map((id) => (
                                <MatchCard
                                    key={id.toString()}
                                    matchId={id}
                                    onClick={() => openMatchRoom(id)}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="pk-grid">
                        {challengeIds.length === 0 ? (
                            <div className="pk-empty">
                                <div className="pk-empty-icon">🎣</div>
                                <p>Chưa có kèo nào đang chờ</p>
                            </div>
                        ) : (
                            challengeIds.map((id) => <PKChallengeCard key={id.toString()} challengeId={id} />)
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="pk-footer">
                <span>Min Deposit: {minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."} BANMAO</span>
                <span>•</span>
                <span>Powered by BanMao PK V11</span>
            </footer>

            {/* === DRAGGABLE PANELS === */}

            {/* Create Challenge Panel */}
            <DraggablePanel
                id="create"
                title="Tạo Kèo Mới"
                icon="🎯"
                isOpen={openPanels.create}
                onClose={() => closePanel("create")}
                onMinimize={() => minimizePanel("create")}
                onFocus={() => focusPanel("create")}
                zIndex={panelZIndices.create}
                defaultPosition={{ x: 120, y: 80 }}
                defaultSize={{ width: 360, height: 480 }}
            >
                <CreateChallengePanel onSuccess={handleChallengeCreated} />
            </DraggablePanel>

            {/* Profile Panel */}
            <DraggablePanel
                id="profile"
                title="Profile"
                icon="👤"
                isOpen={openPanels.profile}
                onClose={() => closePanel("profile")}
                onMinimize={() => minimizePanel("profile")}
                onFocus={() => focusPanel("profile")}
                zIndex={panelZIndices.profile}
                defaultPosition={{ x: 200, y: 120 }}
                defaultSize={{ width: 340, height: 400 }}
            >
                <ProfilePanel />
            </DraggablePanel>

            {/* Match Room Panel */}
            <DraggablePanel
                id="matchroom"
                title={`Match #${selectedMatchId?.toString() || ""}`}
                icon="🥊"
                isOpen={openPanels.matchroom}
                onClose={() => closePanel("matchroom")}
                onMinimize={() => minimizePanel("matchroom")}
                onFocus={() => focusPanel("matchroom")}
                zIndex={panelZIndices.matchroom}
                defaultPosition={{ x: 280, y: 60 }}
                defaultSize={{ width: 400, height: 580 }}
            >
                {selectedMatchId && <MatchRoomPanel matchId={selectedMatchId} />}
            </DraggablePanel>

            {/* Taskbar for minimized panels */}
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
