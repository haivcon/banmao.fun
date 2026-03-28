"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Lang } from "../i18n";
import { translateFolder, translateName } from "../i18n/nameDict";

interface ImageData {
    src: string;
    thumb: string;
    name: string;
    folder: string;
    bytes: number;
    isVideo: boolean;
    duration?: number;
}

interface StatsProps {
    images: ImageData[];
    downloadCounts: Record<string, number>;
    onClose: () => void;
    t: Record<string, string>;
    lang: Lang;
    onDownload?: (name: string) => void;
}

function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function formatDurationHMS(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

/** Animated number — counts up from 0 to target on mount */
function CountUp({ target }: { target: number }) {
    const [val, setVal] = useState(0);
    const ref = useRef<number>(0);

    useEffect(() => {
        if (target === 0) return;
        const duration = 800;
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(eased * target));
            if (progress < 1) ref.current = requestAnimationFrame(animate);
        };
        ref.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(ref.current);
    }, [target]);

    return <>{val.toLocaleString()}</>;
}

/**
 * Collection Statistics Dashboard
 * Real-time data from Cloudinary, clickable folder rows with image preview.
 */
export default function CollectionStats({ images, downloadCounts, onClose, t, lang, onDownload }: StatsProps) {
    const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

    const stats = useMemo(() => {
        const totalImages = images.filter(i => !i.isVideo).length;
        const totalVideos = images.filter(i => i.isVideo).length;
        const totalBytes = images.reduce((sum, i) => sum + i.bytes, 0);
        const totalDuration = images.reduce((sum, i) => sum + (i.duration || 0), 0);

        // Folder breakdown — ALL folders for accurate count
        const folderMap = new Map<string, { count: number; bytes: number }>();
        for (const img of images) {
            const f = img.folder || "root";
            const existing = folderMap.get(f) || { count: 0, bytes: 0 };
            folderMap.set(f, { count: existing.count + 1, bytes: existing.bytes + img.bytes });
        }
        const allFolders = [...folderMap.entries()].sort((a, b) => b[1].count - a[1].count);
        const totalFolderCount = allFolders.length;

        // Top downloaded — show ALL entries from localStorage
        const topDownloaded = Object.entries(downloadCounts)
            .sort((a, b) => b[1] - a[1]);

        return { totalImages, totalVideos, totalBytes, totalDuration, allFolders, totalFolderCount, topDownloaded, total: images.length };
    }, [images, downloadCounts]);

    // Get all images for a specific folder
    const getFolderImages = useCallback((folder: string): ImageData[] => {
        return images.filter(i => i.folder === folder);
    }, [images]);

    // Generate conic-gradient for pie chart
    const pieGradient = useMemo(() => {
        const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1",
            "#14b8a6", "#84cc16", "#f43f5e", "#d946ef", "#0ea5e9", "#facc15", "#fb923c", "#4ade80"];
        let deg = 0;
        const segments: string[] = [];
        for (let i = 0; i < stats.allFolders.length; i++) {
            const pct = (stats.allFolders[i][1].count / stats.total) * 360;
            segments.push(`${colors[i % colors.length]} ${deg}deg ${deg + pct}deg`);
            deg += pct;
        }
        if (deg < 360) {
            segments.push(`rgba(255,255,255,0.1) ${deg}deg 360deg`);
        }
        return `conic-gradient(${segments.join(", ")})`;
    }, [stats]);

    const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1",
        "#14b8a6", "#84cc16", "#f43f5e", "#d946ef", "#0ea5e9", "#facc15", "#fb923c", "#4ade80"];

    const folderDisplayName = (folder: string): string => {
        const baseName = folder.split("/").pop() || folder;
        if (lang === "en") return baseName;
        return translateFolder(baseName, lang as "vi" | "zh" | "ko" | "ru" | "id");
    };

    const imgDisplayName = (name: string): string => {
        if (lang === "en") return name;
        return translateName(name, lang as "vi" | "zh" | "ko" | "ru" | "id");
    };

    // Bar animation trigger
    const [barsVisible, setBarsVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setBarsVisible(true), 300);
        return () => clearTimeout(timer);
    }, []);

    const hasVideos = stats.totalVideos > 0;

    // Download handler — also calls onDownload to update parent state
    const handleDownload = async (img: ImageData) => {
        try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = img.name.replace(/\s+/g, "_").toLowerCase() + (img.isVideo ? ".mp4" : ".png");
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (onDownload) onDownload(img.name);
        } catch {
            window.open(img.src, "_blank");
        }
    };

    return (
        <div className="col-stats-overlay" onClick={onClose}>
            <div className="col-stats-modal col-stats-animated" onClick={(e) => e.stopPropagation()}>
                <div className="col-stats-header">
                    <h2>📊 {t.statsTitle || "Collection Statistics"}</h2>
                    <button className="col-stats-close" onClick={onClose}>✕</button>
                </div>

                {/* Summary Cards */}
                <div className={`col-stats-cards ${hasVideos ? "col-stats-cards-5" : ""}`}>
                    <div className="col-stat-card col-stat-card-anim" style={{ animationDelay: "0.05s" }}>
                        <span className="col-stat-icon">🖼️</span>
                        <span className="col-stat-value"><CountUp target={stats.totalImages} /></span>
                        <span className="col-stat-label">{t.statsImages || "Images"}</span>
                    </div>
                    <div className="col-stat-card col-stat-card-anim" style={{ animationDelay: "0.1s" }}>
                        <span className="col-stat-icon">🎬</span>
                        <span className="col-stat-value"><CountUp target={stats.totalVideos} /></span>
                        <span className="col-stat-label">{t.statsVideos || "Videos"}</span>
                    </div>
                    <div className="col-stat-card col-stat-card-anim" style={{ animationDelay: "0.15s" }}>
                        <span className="col-stat-icon">💾</span>
                        <span className="col-stat-value">{formatBytes(stats.totalBytes)}</span>
                        <span className="col-stat-label">{t.statsTotalSize || "Total Size"}</span>
                    </div>
                    <div className="col-stat-card col-stat-card-anim" style={{ animationDelay: "0.2s" }}>
                        <span className="col-stat-icon">📁</span>
                        <span className="col-stat-value"><CountUp target={stats.totalFolderCount} /></span>
                        <span className="col-stat-label">{t.statsFolders || "Folders"}</span>
                    </div>
                    {hasVideos && (
                        <div className="col-stat-card col-stat-card-anim" style={{ animationDelay: "0.25s" }}>
                            <span className="col-stat-icon">⏱️</span>
                            <span className="col-stat-value">{formatDurationHMS(stats.totalDuration)}</span>
                            <span className="col-stat-label">{t.statsVideoDuration || "Video Duration"}</span>
                        </div>
                    )}
                </div>

                {/* Pie Chart + Clickable Legend */}
                <div className="col-stats-section">
                    <h3>{t.statsFolderDist || "Folder Distribution"}</h3>
                    <div className="col-stats-pie-row">
                        <div className="col-stats-pie" style={{ background: pieGradient }} />
                        <div className="col-stats-legend col-stats-legend-scroll">
                            {stats.allFolders.map(([folder, data], i) => {
                                const pct = ((data.count / stats.total) * 100).toFixed(1);
                                const isExpanded = expandedFolder === folder;
                                return (
                                    <div key={folder}>
                                        <div
                                            className={`col-stats-legend-item col-stats-legend-clickable ${isExpanded ? "col-stats-legend-active" : ""}`}
                                            onClick={() => setExpandedFolder(isExpanded ? null : folder)}
                                        >
                                            <span className="col-stats-legend-dot" style={{ background: colors[i % colors.length] }} />
                                            <span className="col-stats-legend-name">
                                                {folderDisplayName(folder)}
                                            </span>
                                            <span className="col-stats-legend-pct">{pct}%</span>
                                            <span className="col-stats-legend-count">{data.count}</span>
                                            <span className="col-stats-legend-arrow">{isExpanded ? "▾" : "▸"}</span>
                                        </div>

                                        {/* Expanded folder preview */}
                                        {isExpanded && (
                                            <div className="col-stats-folder-preview">
                                                {getFolderImages(folder).map((img) => (
                                                    <div key={img.src} className="col-stats-preview-item">
                                                        <img
                                                            src={img.thumb}
                                                            alt={img.name}
                                                            className="col-stats-preview-img"
                                                            loading="lazy"
                                                        />
                                                        <span className="col-stats-preview-name" title={img.name}>
                                                            {imgDisplayName(img.name)}
                                                        </span>
                                                        <button
                                                            className="col-stats-preview-dl"
                                                            title={t.download || "Download"}
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                                                        >⬇</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Downloaded — Bar Chart */}
                {stats.topDownloaded.length > 0 && (
                    <div className="col-stats-section">
                        <h3>{t.statsTopDl || "🔥 Top Downloaded"}</h3>
                        <div className="col-stats-bars">
                            {stats.topDownloaded.map(([name, count], i) => {
                                const maxCount = stats.topDownloaded[0]?.[1] || 1;
                                return (
                                    <div key={name} className="col-stats-bar-row">
                                        <span className="col-stats-bar-name">{name}</span>
                                        <div className="col-stats-bar-track">
                                            <div
                                                className="col-stats-bar-fill"
                                                style={{
                                                    width: barsVisible ? `${(count / maxCount) * 100}%` : "0%",
                                                    background: colors[i % colors.length],
                                                    transitionDelay: `${i * 0.08}s`,
                                                }}
                                            />
                                        </div>
                                        <span className="col-stats-bar-value">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
