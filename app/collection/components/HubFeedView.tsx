"use client";
import React, { useCallback, useRef, memo, useState, useEffect } from "react";
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

    const [showMobileWidgets, setShowMobileWidgets] = useState(false);

    // Auto-close widgets on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300 && showMobileWidgets) {
                setShowMobileWidgets(false);
            }
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [showMobileWidgets]);

    return (
        <div className="hub-feed-container">
        <div className="hub-feed-main">

                {/* Stories Bar */}
                {!hubProfileFilter && (
                    <StoryBar
                        t={t}
                        address={address}
                        isConnected={isConnected}
                        onProfileClick={(addr) => onProfileFilterChange(addr)}
                    />
                )}

                {/* Mobile Action Buttons & Widgets (Hidden on desktop via CSS) */}
                {!hubProfileFilter && isConnected && (
                    <div className="hub-mobile-actions-wrapper">
                        <div className="hub-mobile-actions">
                            <button className="hub-mob-btn hub-mob-btn-profile" onClick={() => { onProfileFilterChange(address || null); onFeedTabChange("newest"); }}>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                {t.myProfile || "Hồ sơ"}
                            </button>
                            <button className={`hub-mob-btn hub-mob-btn-widgets ${showMobileWidgets ? "active" : ""}`} onClick={() => setShowMobileWidgets(!showMobileWidgets)}>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                                {t.questsAndCheckin || "Nhiệm vụ & Điểm danh"}
                            </button>
                        </div>

                        {showMobileWidgets && (
                            <div className="hub-mobile-widgets">
                                <DailyCheckIn t={t} address={address} />
                                <MiniQuests t={t} address={address} />
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile Quests Panel — triggered by bottom nav (separate from above, always renders) */}
                {showMobileWidgets && isConnected && (
                    <div className="hub-bnav-quests-panel">
                        <DailyCheckIn t={t} address={address} />
                        <MiniQuests t={t} address={address} />
                    </div>
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
                            <button className={`hub-ftab ${hubFeedTab === "newest" ? "active" : ""}`} onClick={() => onFeedTabChange("newest")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                {t.sortNewest || t.newest || "Newest"}
                            </button>
                            {isConnected && <button className={`hub-ftab ${hubFeedTab === "following" ? "active" : ""}`} onClick={() => onFeedTabChange("following")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                {t.following || "Following"}
                            </button>}
                            <button className={`hub-ftab ${hubFeedTab === "trending" ? "active" : ""}`} onClick={() => onFeedTabChange("trending")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c-1.5 0-2.5-1-2.5-2.5C15 15 17 14 17 12c0-2.5-1.5-4-3-5-1.5 1-3 2.5-3 5 0 2.5 2 3.5 2 5 0 1.5-1 2.5-2.5 2.5-1.5 0-3-1-3-3 0-3.5 3-5.5 4-8.5C12.5 5 11 3 11 3c0 4-3 5.5-4 8.5 0 2 1.5 4 3 5 .5 1 .5 2 0 2.5C8 20 6 18.5 6 16c0-3.5 2.5-6 4-8.5 1.5-2.5 1-4 1-4 2.5 1 4 3 4 6 0 2-2 3.5-2 6 0 1 1 2 2 2z"></path></svg>
                                {t.trending || "Trending"}
                            </button>
                            <button className={`hub-ftab ${hubFeedTab === "top_tipped" ? "active" : ""}`} onClick={() => onFeedTabChange("top_tipped")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                {t.topTipped || "Top Tipped"}
                            </button>
                            <button className={`hub-ftab ${hubFeedTab === "mining" ? "active" : ""}`} onClick={() => onFeedTabChange("mining")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                {t.mining || "Mining"}
                            </button>
                            {isConnected && <button className={`hub-ftab ${hubFeedTab === "mine" ? "active" : ""}`} onClick={() => onFeedTabChange("mine")}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></svg>
                                {t.myPosts || "My Posts"}
                            </button>}
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

            {/* FAB Create Post (desktop only) */}
            {isConnected && !props.showEditProfile && (
                <button className="hub-fab" onClick={onShowCreatePost} title="Create Post">+</button>
            )}

            {/* Instagram-style Bottom Navigation (mobile only) */}
            <nav className="hub-bottom-nav">
                <button
                    className={`hub-bnav-item ${!hubProfileFilter && (hubFeedTab === 'newest' || hubFeedTab === 'following' || hubFeedTab === 'mine') ? 'active' : ''}`}
                    onClick={() => { onProfileFilterChange(null); onFeedTabChange('newest'); setShowMobileWidgets(false); }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>{t.home || 'Home'}</span>
                </button>
                <button
                    className={`hub-bnav-item ${!hubProfileFilter && (hubFeedTab === 'trending' || hubFeedTab === 'top_tipped' || hubFeedTab === 'mining') ? 'active' : ''}`}
                    onClick={() => { onProfileFilterChange(null); onFeedTabChange('trending'); setShowMobileWidgets(false); }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <span>{t.explore || 'Explore'}</span>
                </button>
                {isConnected && (
                    <button
                        className="hub-bnav-item hub-bnav-create"
                        onClick={onShowCreatePost}
                    >
                        <div className="hub-bnav-create-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                    </button>
                )}
                <button
                    className={`hub-bnav-item ${showMobileWidgets ? 'active' : ''}`}
                    onClick={() => setShowMobileWidgets(!showMobileWidgets)}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    <span>{t.quests || 'Quests'}</span>
                </button>
                <button
                    className={`hub-bnav-item ${hubProfileFilter ? 'active' : ''}`}
                    onClick={() => { if (isConnected && address) { onProfileFilterChange(address); onFeedTabChange('newest'); } }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>{t.profile || 'Profile'}</span>
                </button>
            </nav>
        </div>
    );
});

export default HubFeedView;
