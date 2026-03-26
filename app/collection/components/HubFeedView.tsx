"use client";
import React, { useCallback, useRef, memo } from "react";
import HubPostCard from "./HubPostCard";
import ProfileHeader from "./ProfileHeader";
import EditProfileModal from "./EditProfileModal";
import HubLeaderboard from "./HubLeaderboard";
import { shortAddr } from "../lib/helpers";
import type { HubFeedTab, HubProfileTab } from "../stores/useHubStore";
import StoryBar from "./StoryBar";
import ThemeToggle from "./ThemeToggle";
import DailyCheckIn from "./DailyCheckIn";
import MiniQuests from "./MiniQuests";
import BadgeShowcase from "./BadgeShowcase";
import CreatorAnalytics from "./CreatorAnalytics";

interface HubFeedViewProps {
    t: Record<string, string>;
    address?: string;
    isConnected: boolean;

    // Post data
    hubPosts: any[];
    hubLoading: boolean;
    hubFeedTab: HubFeedTab;
    hubLayout: "grid" | "feed";
    hubProfileFilter: string | null;
    hubProfileTab: HubProfileTab;
    topCreators: any[];
    hubSearch: string;
    hubBookmarks: Set<number>;
    hubLikeAnim: number | null;
    shareMenuPostId: number | null;
    hubMoreOpen: number | null;
    carouselIndices: Record<number, number>;
    inlineCommentTexts: Record<number, string>;
    inlineCommentLoading: Record<number, boolean>;
    showEditProfile: boolean;
    profileRefreshTrigger: number;

    // Callbacks
    onFeedTabChange: (tab: HubFeedTab) => void;
    onLayoutChange: (layout: "grid" | "feed") => void;
    onProfileFilterChange: (filter: string | null) => void;
    onProfileTabChange: (tab: HubProfileTab) => void;
    onHubSearchChange: (search: string) => void;
    onLike: (postId: number) => void;
    onBookmark: (postId: number) => void;
    onReport: (postId: number) => void;
    onOpenPost: (post: any) => void;
    onTip: (postId: number, creatorAddress: string, creatorName: string) => void;
    onShareMenuToggle: (postId: number | null) => void;
    onMoreMenuToggle: (postId: number | null) => void;
    onCarouselChange: (postId: number, index: number) => void;
    onInlineCommentChange: (postId: number, text: string) => void;
    onInlineCommentSubmit: (postId: number) => void;
    onLikeListClick: (postId: number) => void;
    onShowCreatePost: () => void;
    onShowEditProfile: (show: boolean) => void;
    onShowChatInbox: () => void;
    onProfileUpdated: () => void;
    onHubPostsClear: () => void;
    onHubLoadMoreRef?: (node: HTMLDivElement | null) => void;
}

const HubFeedView = memo(function HubFeedView(props: HubFeedViewProps) {
    const {
        t, address, isConnected,
        hubPosts, hubLoading, hubFeedTab, hubLayout,
        hubProfileFilter, hubProfileTab, topCreators,
        hubBookmarks, hubLikeAnim, shareMenuPostId, hubMoreOpen,
        carouselIndices, inlineCommentTexts, inlineCommentLoading,
        showEditProfile, profileRefreshTrigger,
        onFeedTabChange, onLayoutChange, onProfileFilterChange,
        onProfileTabChange, onHubSearchChange,
        onLike, onBookmark, onReport, onOpenPost,
        onTip, onShareMenuToggle, onMoreMenuToggle,
        onCarouselChange, onInlineCommentChange, onInlineCommentSubmit,
        onLikeListClick, onShowCreatePost, onShowEditProfile,
        onShowChatInbox, onProfileUpdated, onHubPostsClear, onHubLoadMoreRef
    } = props;

    return (
        <div className="hub-feed-container">
            <div className="hub-feed-main">
                {/* Hub Header */}
                <div className="hub-feed-header">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h1 className="hub-title">🐱 BanmaoHub</h1>
                        <ThemeToggle t={t} />
                    </div>
                    <p className="hub-subtitle">{t.hubSubtitle || "Share & Discover Banmao Content"}</p>
                    <div className="hub-hero-stats">
                        <div className="hub-hero-stat">
                            <span className="hub-hero-stat-value">{hubPosts.length > 0 ? hubPosts.length + "+" : "—"}</span>
                            <span className="hub-hero-stat-label">Posts</span>
                        </div>
                        <div className="hub-hero-stat">
                            <span className="hub-hero-stat-value">{topCreators.length || "—"}</span>
                            <span className="hub-hero-stat-label">Creators</span>
                        </div>
                        <div className="hub-hero-stat">
                            <span className="hub-hero-stat-value">{topCreators.length > 0 ? "💰" : "—"}</span>
                            <span className="hub-hero-stat-label">Tipping</span>
                        </div>
                    </div>
                </div>

                {/* Stories Bar */}
                {!hubProfileFilter && (
                    <StoryBar
                        t={t}
                        address={address}
                        isConnected={isConnected}
                        onProfileClick={(addr) => onProfileFilterChange(addr)}
                    />
                )}

                {/* Top Creators */}
                {topCreators.length > 0 && !hubProfileFilter && (
                    <div className="hub-top-creators">
                        <h3 className="hub-tc-title">🏆 {t.topCreators || "Top Creators"}</h3>
                        <div className="hub-tc-list">
                            {topCreators.slice(0, 8).map((c: any, i: number) => (
                                <button key={i} className="hub-tc-item" onClick={() => { onProfileFilterChange(c.creator_address); onFeedTabChange("newest"); }}>
                                    <div className="hub-tc-avatar">{(c.username || "?")[0].toUpperCase()}</div>
                                    <span className="hub-tc-name">{c.username || shortAddr(c.creator_address)}</span>
                                    <span className="hub-tc-tips">💰 {(Number(c.total_tips) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Profile View Header */}
                {hubProfileFilter && (
                    <ProfileHeader
                        profileAddress={hubProfileFilter}
                        viewerAddress={address}
                        onBack={() => {
                            onProfileFilterChange(null);
                            onProfileTabChange("posts");
                        }}
                        activeTab={hubProfileTab}
                        onTabChange={(tab) => {
                            onProfileTabChange(tab);
                            onHubPostsClear();
                        }}
                        onEditProfile={() => onShowEditProfile(true)}
                        onMessageClick={() => onShowChatInbox()}
                        t={t}
                        refreshTrigger={profileRefreshTrigger}
                    />
                )}

                {/* Feed Tabs + Create Button */}
                {!hubProfileFilter && (
                    <div className="hub-feed-controls">
                        <div className="hub-feed-tabs">
                            <button className={`hub-ftab ${hubFeedTab === "newest" ? "active" : ""}`} onClick={() => onFeedTabChange("newest")}>🆕 {t.newest || "Newest"}</button>
                            {isConnected && <button className={`hub-ftab ${hubFeedTab === "following" ? "active" : ""}`} onClick={() => onFeedTabChange("following")}>👥 {t.following || "Following"}</button>}
                            <button className={`hub-ftab ${hubFeedTab === "trending" ? "active" : ""}`} onClick={() => onFeedTabChange("trending")}>🔥 {t.trending || "Trending"}</button>
                            <button className={`hub-ftab ${hubFeedTab === "top_tipped" ? "active" : ""}`} onClick={() => onFeedTabChange("top_tipped")}>💰 {t.topTipped || "Top Tipped"}</button>
                            <button className={`hub-ftab ${hubFeedTab === "mining" ? "active" : ""}`} onClick={() => onFeedTabChange("mining")}>⛏️ {t.mining || "Mining"}</button>
                            {isConnected && <button className={`hub-ftab ${hubFeedTab === "mine" ? "active" : ""}`} onClick={() => onFeedTabChange("mine")}>📝 {t.myPosts || "My Posts"}</button>}
                        </div>
                        <div className="hub-controls-right">
                            <div className="hub-layout-toggle">
                                <button className={`hub-layout-btn ${hubLayout === "grid" ? "active" : ""}`} onClick={() => onLayoutChange("grid")} title="Grid">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1" /><rect x="9" y="0" width="7" height="7" rx="1" /><rect x="0" y="9" width="7" height="7" rx="1" /><rect x="9" y="9" width="7" height="7" rx="1" /></svg>
                                </button>
                                <button className={`hub-layout-btn ${hubLayout === "feed" ? "active" : ""}`} onClick={() => onLayoutChange("feed")} title="Feed">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="16" height="4" rx="1" /><rect x="0" y="6" width="16" height="4" rx="1" /><rect x="0" y="12" width="16" height="4" rx="1" /></svg>
                                </button>
                            </div>
                            {isConnected && (
                                <>
                                    <button className="hub-btn hub-btn-secondary" onClick={() => { onProfileFilterChange(address!); onFeedTabChange("newest"); }} title="My Profile" style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                    </button>
                                    <button className="hub-btn hub-btn-primary hub-create-btn" onClick={onShowCreatePost}>
                                        ➕ {t.createPost || "Post"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Edit Profile Modal */}
                {showEditProfile && address && (
                    <EditProfileModal
                        t={t}
                        address={address}
                        onClose={() => onShowEditProfile(false)}
                        onUpdated={onProfileUpdated}
                    />
                )}

                {/* Social Mining Leaderboard */}
                {hubFeedTab === "mining" && !hubProfileFilter && (
                    <HubLeaderboard
                        t={t}
                        onProfileClick={(addr) => onProfileFilterChange(addr)}
                    />
                )}

                {/* Posts Feed */}
                {hubFeedTab !== "mining" && (
                    <>
                        {hubLoading && hubPosts.length === 0 ? (
                            <div className={`hub-feed-grid ${hubLayout === "feed" ? "hub-feed-single" : ""}`}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="hub-card hub-card-skeleton">
                                        <div className="hub-card-author-row"><div className="hub-skel-circle" /><div className="hub-skel-line" /></div>
                                        <div className="hub-skel-media" />
                                        <div className="hub-skel-actions"><div className="hub-skel-line-sm" /><div className="hub-skel-line-sm" /></div>
                                    </div>
                                ))}
                            </div>
                        ) : hubPosts.length === 0 ? (
                            <div className="hub-empty">
                                <div className="hub-empty-graphic">
                                    <div className="hub-empty-cat">🐱</div>
                                    <div className="hub-empty-zz">Z</div>
                                    <div className="hub-empty-zz">Z</div>
                                    <div className="hub-empty-shadow"></div>
                                </div>
                                <p>{t.noPosts || "No posts yet"}</p>
                                <p style={{ fontSize: "14px", opacity: 0.6 }}>{t.beFirstToShare || "Be the first to share Banmao content!"}</p>
                                {isConnected && <button className="hub-btn hub-btn-primary" onClick={onShowCreatePost}>➕ {t.createPost || "Create Post"}</button>}
                            </div>
                        ) : (
                            <div className={`hub-feed-grid ${hubLayout === "feed" ? "hub-feed-single" : ""}`}>
                                {hubPosts.map((post: any, postIdx: number) => (
                                    <HubPostCard
                                        key={post.id}
                                        post={post}
                                        t={t}
                                        postIdx={postIdx}
                                        address={address}
                                        isConnected={isConnected}
                                        hubBookmarks={hubBookmarks}
                                        hubLikeAnim={hubLikeAnim}
                                        shareMenuPostId={shareMenuPostId}
                                        hubMoreOpen={hubMoreOpen}
                                        carouselIndices={carouselIndices}
                                        inlineCommentTexts={inlineCommentTexts}
                                        inlineCommentLoading={inlineCommentLoading}
                                        onLike={onLike}
                                        onDoubleTap={onLike}
                                        onBookmark={onBookmark}
                                        onReport={onReport}
                                        onOpenPost={onOpenPost}
                                        onProfileClick={(addr) => onProfileFilterChange(addr)}
                                        onTip={onTip}
                                        onShareMenuToggle={onShareMenuToggle}
                                        onMoreMenuToggle={onMoreMenuToggle}
                                        onCarouselChange={onCarouselChange}
                                        onInlineCommentChange={onInlineCommentChange}
                                        onInlineCommentSubmit={onInlineCommentSubmit}
                                        onHashtagClick={onHubSearchChange}
                                        onLikeListClick={onLikeListClick}
                                    />
                                ))}

                                {/* Infinite Scroll Sentinel */}
                                <div ref={onHubLoadMoreRef} className="hub-load-more">
                                    {hubLoading && <div className="hub-loading-dots">⏳</div>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Desktop Sidebar */}
            {!hubProfileFilter && (
                <aside className="hub-sidebar">
                    {/* Daily Check-in */}
                    {isConnected && (
                        <DailyCheckIn t={t} address={address} />
                    )}

                    {/* Mini Quests */}
                    {isConnected && (
                        <MiniQuests t={t} address={address} />
                    )}

                    <div className="hub-sidebar-card">
                        <h4 className="hub-sidebar-title">🔥 {t.trendingTitle || "Trending"}</h4>
                        <div className="hub-sidebar-tags">
                            {["#banmao", "#sticker", "#meme", "#fanart", "#nft", "#community"].map(tag => (
                                <button key={tag} className="hub-sidebar-tag" onClick={() => onHubSearchChange(tag)}>{tag}</button>
                            ))}
                        </div>
                    </div>
                    {topCreators.length > 0 && (
                        <div className="hub-sidebar-card">
                            <h4 className="hub-sidebar-title">⭐ {t.suggestedTitle || "Suggested"}</h4>
                            {topCreators.slice(0, 3).map((c: any, i: number) => (
                                <button key={i} className="hub-tc-item" style={{ flexDirection: "row", gap: "10px", minWidth: "auto", width: "100%", justifyContent: "flex-start", padding: "8px 4px" }} onClick={() => { onProfileFilterChange(c.creator_address); onFeedTabChange("newest"); }}>
                                    <div className="hub-avatar">{(c.username || "?")[0].toUpperCase()}</div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                        <span className="hub-tc-name">{c.username || shortAddr(c.creator_address)}</span>
                                        <span className="hub-tc-tips">💰 {(Number(c.total_tips) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Badges */}
                    {isConnected && (
                        <BadgeShowcase t={t} address={address} />
                    )}
                </aside>
            )}

            {/* Profile Analytics (when viewing own profile) */}
            {hubProfileFilter && address && hubProfileFilter.toLowerCase() === address.toLowerCase() && (
                <div style={{ padding: "0 16px" }}>
                    <CreatorAnalytics t={t} address={address} />
                </div>
            )}

            {/* FAB Create Post */}
            {isConnected && !props.showEditProfile && (
                <button className="hub-fab" onClick={onShowCreatePost} title="Create Post">+</button>
            )}
        </div>
    );
});

export default HubFeedView;
