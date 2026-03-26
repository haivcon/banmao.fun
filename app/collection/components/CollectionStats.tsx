"use client";

import React, { useMemo } from "react";

interface StatsProps {
    images: { folder: string; bytes: number; isVideo: boolean; duration?: number }[];
    downloadCounts: Record<string, number>;
    onClose: () => void;
}

function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Collection Statistics Dashboard — CSS-only charts, no external library.
 * Shows: total counts, folder breakdown pie chart, top downloaded, size distribution.
 */
export default function CollectionStats({ images, downloadCounts, onClose }: StatsProps) {
    const stats = useMemo(() => {
        const totalImages = images.filter(i => !i.isVideo).length;
        const totalVideos = images.filter(i => i.isVideo).length;
        const totalBytes = images.reduce((sum, i) => sum + i.bytes, 0);
        const totalDuration = images.reduce((sum, i) => sum + (i.duration || 0), 0);

        // Folder breakdown
        const folderMap = new Map<string, { count: number; bytes: number }>();
        for (const img of images) {
            const f = img.folder || "root";
            const existing = folderMap.get(f) || { count: 0, bytes: 0 };
            folderMap.set(f, { count: existing.count + 1, bytes: existing.bytes + img.bytes });
        }
        const folders = [...folderMap.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        // Top downloaded
        const topDownloaded = Object.entries(downloadCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return { totalImages, totalVideos, totalBytes, totalDuration, folders, topDownloaded, total: images.length };
    }, [images, downloadCounts]);

    // Generate conic-gradient for pie chart
    const pieGradient = useMemo(() => {
        const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1"];
        let deg = 0;
        const segments: string[] = [];
        for (let i = 0; i < stats.folders.length; i++) {
            const pct = (stats.folders[i][1].count / stats.total) * 360;
            segments.push(`${colors[i % colors.length]} ${deg}deg ${deg + pct}deg`);
            deg += pct;
        }
        if (deg < 360) {
            segments.push(`rgba(255,255,255,0.1) ${deg}deg 360deg`);
        }
        return `conic-gradient(${segments.join(", ")})`;
    }, [stats]);

    const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1"];

    return (
        <div className="col-stats-overlay" onClick={onClose}>
            <div className="col-stats-modal" onClick={(e) => e.stopPropagation()}>
                <div className="col-stats-header">
                    <h2>📊 Collection Statistics</h2>
                    <button className="col-stats-close" onClick={onClose}>✕</button>
                </div>

                {/* Summary Cards */}
                <div className="col-stats-cards">
                    <div className="col-stat-card">
                        <span className="col-stat-icon">🖼️</span>
                        <span className="col-stat-value">{stats.totalImages.toLocaleString()}</span>
                        <span className="col-stat-label">Images</span>
                    </div>
                    <div className="col-stat-card">
                        <span className="col-stat-icon">🎬</span>
                        <span className="col-stat-value">{stats.totalVideos.toLocaleString()}</span>
                        <span className="col-stat-label">Videos</span>
                    </div>
                    <div className="col-stat-card">
                        <span className="col-stat-icon">💾</span>
                        <span className="col-stat-value">{formatBytes(stats.totalBytes)}</span>
                        <span className="col-stat-label">Total Size</span>
                    </div>
                    <div className="col-stat-card">
                        <span className="col-stat-icon">📁</span>
                        <span className="col-stat-value">{stats.folders.length}</span>
                        <span className="col-stat-label">Folders</span>
                    </div>
                </div>

                {/* Pie Chart + Legend */}
                <div className="col-stats-section">
                    <h3>Folder Distribution</h3>
                    <div className="col-stats-pie-row">
                        <div className="col-stats-pie" style={{ background: pieGradient }} />
                        <div className="col-stats-legend">
                            {stats.folders.map(([folder, data], i) => (
                                <div key={folder} className="col-stats-legend-item">
                                    <span className="col-stats-legend-dot" style={{ background: colors[i % colors.length] }} />
                                    <span className="col-stats-legend-name">{folder.split("/").pop() || folder}</span>
                                    <span className="col-stats-legend-count">{data.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Downloaded — Bar Chart */}
                {stats.topDownloaded.length > 0 && (
                    <div className="col-stats-section">
                        <h3>🔥 Top Downloaded</h3>
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
                                                    width: `${(count / maxCount) * 100}%`,
                                                    background: colors[i % colors.length],
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
